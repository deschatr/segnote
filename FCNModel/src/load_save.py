import tensorflow as tf

"""
Import model
"""
import models.ESPNet as ESPNet

class mIOU(tf.keras.metrics.MeanIoU):
    """
    defining the mIOOU metrics
    """
    def update_state(self, y_true, y_pred, sample_weight=None):
        return super().update_state(y_true, tf.argmax(y_pred, axis=3), sample_weight)

"""
Specifies the number of classes. There are 100 classes in the dataset used (this is the instance segmentation dataset)
with the background class 0 that is 101 classes
"""
classes = 101

"""
defines training parameters
"""
learning_rate=0.0001

print("TensorFlow version: {}".format(tf.__version__))

"""
defines input and output
"""
inputs = tf.keras.Input(shape=(None,None,3))
outputs = ESPNet.model(inputs,classes=classes,p=2,q=8)

"""
define model and compile
"""
model = tf.keras.Model(inputs = inputs, outputs = outputs,name="ESPNet")
model.summary()

model.compile(  optimizer = tf.keras.optimizers.Adam(learning_rate=learning_rate),
                  loss=tf.keras.losses.SparseCategoricalCrossentropy(from_logits=True),
                  metrics=['accuracy',mIOU(num_classes=classes,name='mIOU')],
                  weighted_metrics=['accuracy'])

model.load_weights('ESPNet/model_weights/ESPNet.ckpt')

model.save('ESPNet/saved_model')
