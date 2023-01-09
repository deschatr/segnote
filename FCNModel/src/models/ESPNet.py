import tensorflow as tf
from tensorflow import keras
from keras.utils.vis_utils import plot_model

__author__ = "Nicolas Deschatrettes"

'''
This model is a TensorFlow implementation of the ESPNet image segmentation model
from the pytorch code by Sachin Mehta from the ESPNet github repository

I kept the original comments in the corresponding sections, and added my own
The name of most variables and functions have been kept identical in order to 
simplify the comparison between the 2 codes

Differences between this implementation and the original one:
- complete encoder/decoder layers are created here, the encoder is not pre-trained
- ReLu activations are used instead of PRELu activations (CBR)
- padding of the input for the dilated convolution layer in CDilated, this is
  to reproduce the pytorch convolution layer feature in tensorflow
'''

def CBR(input, filters, kernel_size, stride=1):
    '''
    This function defines the convolution layer with batch normalization and ReLU activation
    * PReLu activation has been replaced by relu activation integrated in the conv2d layer
    '''
    output = keras.layers.Conv2D(
        filters = filters,
        kernel_size = kernel_size,
        strides = stride,
        padding = "same",
        use_bias = False)(input)
    output = keras.layers.BatchNormalization(epsilon = 1e-03)(output)
    output = keras.layers.ReLU()(output)
    return output
    
def BR(input):
    '''
    This function groups the batch normalization and ReLU activation
    '''
    output = keras.layers.BatchNormalization(epsilon = 1e-03)(input)
    output = keras.layers.ReLU()(output)
    return output
    
def C(input, filters, kernel_size, stride=1):
    '''
    This class is for a convolutional layer.
    '''
    output = keras.layers.Conv2D(
        filters = filters,
        kernel_size = kernel_size,
        strides = stride,
        padding = "same",
        use_bias = False)(input)
    return output

def CDilated(input, filters, kernel_size, stride=1, d=1):
    '''
    This function defines the dilated convolution.
    '''
    pad = int((kernel_size - 1)/2) * d
    padding = tf.constant([[0,0],[pad, pad],[pad, pad],[0,0]])
    output = tf.pad(input,padding)
    output = keras.layers.Conv2D(
        filters = filters,
        kernel_size = kernel_size,
        strides = stride,
        padding = "valid",
        use_bias = False,
        dilation_rate = d)(output)
    return output

def DownSamplerB(input, nOut):
    n = int(nOut/5)
    n1 = nOut - 4*n

    output1 = C(input,n, 3, 2)
    d1 = CDilated(output1, n1, 3, 1, 1)
    d2 = CDilated(output1, n, 3, 1, 2)
    d4 = CDilated(output1, n, 3, 1, 4)
    d8 = CDilated(output1, n, 3, 1, 8)
    d16 = CDilated(output1, n, 3, 1, 16)

    add1 = d2
    add2 = add1 + d4
    add3 = add2 + d8
    add4 = add3 + d16

    combine = tf.concat([d1, add1, add2, add3, add4],3)
    output = BR(combine)
    return output

def DilatedParallelResidualBlockB(input, nOut, add=True):
    '''
    This functions defines the ESP block, which is based on the following principle
    Reduce ---> Split ---> Transform --> Merge
    '''
    n = int(nOut/5)
    n1 = nOut - 4*n

    # reduce
    output1 = C(input,n, 1, 1)
    # split and transform
    d1 = CDilated(output1,n1, 3, 1, 1)
    d2 = CDilated(output1,n, 3, 1, 2)
    d4 = CDilated(output1,n, 3, 1, 4)
    d8 = CDilated(output1,n, 3, 1, 8)
    d16 = CDilated(output1,n, 3, 1, 16)

    # hierarchical fusion for de-gridding
    add1 = d2
    add2 = add1 + d4
    add3 = add2 + d8
    add4 = add3 + d16

    #merge
    combine = tf.concat([d1, add1, add2, add3, add4],3)

    # if residual version
    if add:
        combine = input + combine
    output = BR(combine)
    return output

def InputProjectionA(input, samplingTimes):
    '''
    This function projects the input image to the same spatial dimensions as the feature map.
    For example, if the input image is 512 x512 x3 and spatial dimensions of feature map size are 56x56xF, then
    this function will generate an output of 56x56x3
    '''
    for i in range(0, samplingTimes):
        #pyramid-based approach for down-sampling
        input = tf.keras.layers.AveragePooling2D(pool_size=3, strides=2, padding="same")(input)
    return input

def model(inputs, classes=20, p=2, q=8):
    '''
    This function defines the ESPNet network
    * the default values have been changed to p=2 and q=8 to reflect the definition of ESPNet
    * the default number of classes is left unchanged although the target dataset has 101/151 classes
    ** note that the image height and width must be a multiples 8 otherwise the model will crash
    '''
    output0 = CBR(input=inputs, filters=16, kernel_size=3, stride=2)
    
    inp1 = InputProjectionA(input=inputs, samplingTimes=1)
    output0_cat = BR(tf.concat([output0, inp1],3))
    output1_0 = DownSamplerB(output0_cat, 64) # down-sampled

    for i in range(0, p):
        if i==0:
            output1 = DilatedParallelResidualBlockB(output1_0,64)
        else:
            output1 = DilatedParallelResidualBlockB(output1,64)

    inp2 = InputProjectionA(input=inputs, samplingTimes=2)
    output1_cat = BR(tf.concat([output1,  output1_0, inp2],3))

    output2_0 = DownSamplerB(output1_cat, 128) # down-sampled

    for i in range(0, q):
        if i==0:
            output2 = DilatedParallelResidualBlockB(output2_0, 128)
        else:
            output2 = DilatedParallelResidualBlockB(output2, 128)

    output2_cat = BR(tf.concat([output2_0, output2], 3))

    output2_c = C(output2_cat,classes, 1, 1)
    output2_c = tf.keras.layers.BatchNormalization(epsilon=1e-03)(output2_c)
    output2_c = tf.keras.layers.Conv2DTranspose(filters=classes, kernel_size=2, strides=2, use_bias=False)(output2_c) #RUM
    output1_c = C(output1_cat,classes, 1, 1) # project to C-dimensional space
    comb_l2_l3 = BR(tf.concat([output1_c, output2_c], 3)) #RUM
    comb_l2_l3 = DilatedParallelResidualBlockB(comb_l2_l3,classes, add=False) #RUM
    comb_l2_l3 = tf.keras.layers.Conv2DTranspose(filters=classes, kernel_size=2, strides=2, use_bias=False)(comb_l2_l3) #RUM
    comb_l2_l3 = BR(comb_l2_l3) #RUM

    concat_features = CBR(tf.concat([comb_l2_l3, output0_cat], 3), classes, 3, 1)

    classifier = tf.keras.layers.Conv2DTranspose(filters=classes, kernel_size=2, strides=2, use_bias=False)(concat_features)
    return classifier