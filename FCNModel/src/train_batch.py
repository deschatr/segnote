import os
#os.environ["CUDA_VISIBLE_DEVICES"]="-1"

import tensorflow as tf
from tensorflow import keras
import tensorflow_datasets as tfds
import csv

"""
Import model
"""
import models.ESPNet as ESPNet

"""
define image size
stats for the sceneparsing dataset:
    Width: min 130, average 515.995596239494, max 2100
    Height: min 96, average 416.5069767441865, max 2100
    Ratio: min 0.44833625218914186, average 1.2427147989112397, max 3.9

    chosen size and aspect ratio: W: 512 x H: 416 -> ratio = 1.2307
"""
image_width = 512
image_height = 416

"""
Specifies the number of classes. There are 100 classes in the dataset used (this is the instance segmentation dataset)
with the background class 0 that is 101 classes
"""
classes = 101

"""
defines training parameters
"""
learning_rate=0.001
batch_size = 12
epochs = 2
checkpoint_dir = "training/training_demo"
checkpoint_path = checkpoint_dir + "/cp-{epoch:04d}.ckpt"

def crop8(image):
    """
    crops an image to the nearest multiple of 8
    """
    shape = tf.shape(image)
    target_height = 8 * (shape[0] // 8)
    target_width = 8 * (shape[1] // 8)
    return tf.image.resize_with_crop_or_pad(image,target_height,target_width)

def resize(image,height,width):
    """
    resizes an image to the specified dimensions
    """
    resized_image = tf.image.resize(image,(height,width),method='nearest')
    return resized_image

def transform(image):
    """
    defines the transformation applied to images and labels
    in this case resizing, as we nee images to be of the same size to put them in batches
    """
    return resize(image,image_height,image_width)

class mIOU(tf.keras.metrics.MeanIoU):
    """
    defining the mIOOU metrics by 
    """
    def update_state(self, y_true, y_pred, sample_weight=None):
        return super().update_state(y_true, tf.argmax(y_pred, axis=3), sample_weight)

cp_callback = tf.keras.callbacks.ModelCheckpoint(
    filepath=checkpoint_path, 
    verbose=0, 
    save_weights_only=True,
    save_freq="epoch")

class CustomCallback(keras.callbacks.Callback):
    """
    defines the callbacks during training:
    save the metrics in a csv file after each epoch
    """

    def on_train_end(self, logs=None):
        # save model
        keys = list(logs.keys())
        print("Stop training; got log keys: {}".format(keys))

    def on_epoch_end(self, epoch, logs=None):
        try:
            with open(checkpoint_dir + '/model_history.csv','a',newline='') as f:
                y = csv.DictWriter(f,logs.keys())
                y.writerow(logs)
        except:
            print("Error writing to csv file at epoch",epoch)

print("TensorFlow version: {}".format(tf.__version__))
print("TensorFlow training_datasets version: ",tfds.__version__)

""" 
load training and validation data
"""
training_dataset, info = tfds.load('scene_parse150', split='train[:1%]', shuffle_files=True, as_supervised=True, with_info=True)
validation_dataset = tfds.load('scene_parse150', split='test', shuffle_files=True, as_supervised=True)

"""
computing class weights
"""
glblhist = tf.zeros([classes],tf.float32)
glbl_class_inst = tf.zeros([classes],tf.int32)

count = 0
print("Processing class weights...")
print(count,end='')
all_values = tf.constant([0],tf.int32)

for (image, label) in training_dataset:
    hist = tf.histogram_fixed_width(tf.cast(label,tf.int32),[0,classes-1],nbins=classes,dtype=tf.int32)
    glblhist += tf.cast(hist,tf.float32)
    count += 1
    print('\r' + str(count),end='')
    values, id = tf.unique(tf.reshape(tf.cast(label,tf.int32),[-1]))
    class_inst = tf.histogram_fixed_width(values,[0,classes-1],nbins=classes,dtype=tf.int32)
    glbl_class_inst = glbl_class_inst + class_inst
    all_values = tf.concat([all_values,values],0)
    all_values, id = tf.unique(all_values)

print()
print("Number of images containing given class:")
print(glbl_class_inst)

normVal = 1.02
normHist = glblhist / tf.math.reduce_sum(glblhist)
classWeights = 1 / tf.math.log(normHist + normVal)
class_weights = classWeights.numpy()

"""
pre process training and validation data :
- resize
- add class weights
"""
training_dataset = training_dataset.map( lambda image,annotation: ( tf.cast(transform(image),tf.float32) / 255.0,transform(annotation)[:,:,0] ))
training_dataset = training_dataset.map( lambda image,annotation: ( image, annotation, tf.gather(classWeights,tf.cast(annotation,tf.int32)) ))

validation_dataset = validation_dataset.map( lambda image,annotation: ( tf.cast(transform(image),tf.float32) / 255.0,transform(annotation)[:,:,0] ))
validation_dataset = validation_dataset.map( lambda image,annotation: ( image, annotation, tf.gather(classWeights,tf.cast(annotation,tf.int32)) ))

train_length = training_dataset.cardinality().numpy()
buffer_size = 400
steps_per_epoch = train_length // batch_size

"""
make batches
"""
training_batches = training_dataset.batch(batch_size)
validation_batches = validation_dataset.batch(batch_size)

"""
defines input and output
"""
inputs = tf.keras.Input(shape=(image_height,image_width,3))
outputs = ESPNet.model(inputs,classes=classes,p=2,q=8)

"""
define model and compile
"""
model = tf.keras.Model(inputs = inputs, outputs = outputs,name="ESPNet")

model.compile(  optimizer = tf.keras.optimizers.Adam(learning_rate=learning_rate),
                  loss=tf.keras.losses.SparseCategoricalCrossentropy(from_logits=True),
                  metrics=['accuracy',mIOU(num_classes=classes,name='mIOU')],
                  weighted_metrics=['accuracy'])

"""
load previous state of training
"""
#model.load_weights('training/training_k8_20k_12b_lr10-3_01/cp-0300.ckpt')

"""
train
"""
model_history = model.fit(  training_batches,
                            epochs=epochs, initial_epoch = 0,
                            callbacks=[cp_callback,CustomCallback()],
                            validation_data = validation_batches, validation_freq = 10)