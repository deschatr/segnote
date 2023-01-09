import * as tf from '@tensorflow/tfjs';
//import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import {loadGraphModel} from '@tensorflow/tfjs-converter';

// mode ESPNet to be save in python with model.save(filepath,save_format='tf',include_optimizer=False)

const classNames = [ "bed","windowpane","cabinet","person","door",
            "table","curtain","chair","car","painting",
            "sofa","shelf","mirror","armchair","seat",
            "fence","desk","wardrobe","lamp","bathtub",
            "railing","cushion","box","column","signboard",
            "chest of drawers","counter","sink","fireplace","refrigerator",
            "stairs","case","pool table","pillow","screen door",
            "bookcase","coffee table","toilet","flower","book",
            "bench","countertop","stove","palm","kitchen island",
            "computer","swivel chair","boat","arcade machine","bus",
            "towel","light","truck","chandelier","awning",
            "streetlight","booth","television receiver","airplane","apparel",
            "pole","bannister","ottoman","bottle","van",
            "ship","fountain","washer","plaything","stool",
            "barrel","basket","bag","minibike","oven",
            "ball","food","step","trade name","microwave",
            "pot","animal","bicycle","dishwasher","screen",
            "sculpture","hood","sconce","vase","traffic light",
            "tray","ashcan","fan","plate","monitor",
            "bulletin board","radiator","glass","clock","flag"]
            
/**
 * 
 * @param {number} number 
 * @returns string
 */
function getClassName(number) {
    if (number > 0 && number <= classNames.length) return classNames[number-1]
    else return null
}

/**
 * 
 * @param {string} url 
 * @returns object
 */
async function loadESPNet(url) {
    const model = await loadGraphModel(url);
    return model;
    // return model
    // await loadGraphModel(MODEL_URL);
    // return promise
}

/**
 * converts an image to a tensor suitable for ESPNet
 * the image is resized to dimensions multiple of 8
 * @param {object} image 
 * @returns tfjs tensor
 */
async function imageToTensor(image) {
    const height = 8 * Math.floor(image.height / 8);
    const width = 8 * Math.floor(image.width / 8);
    let tensor = tf.browser.fromPixels(image).resizeBilinear([height,width]);
    return tensor;
}

/**
 * execute the model prediction with the provided image
 * @param {object} ESPNet model
 * @param {object} tfjs tensor not normalised
 * @returns { object } {tensor: tensor2D, { classes: dict }} 
 * tensor: 2D tensor containing pixel-wise class number, { classes } collection of classes}
 */
async function runESPNet( model, input ) {

    // normalizes the image, and adds batch dimension
    let normInput = input.div(tf.scalar(255));
    normInput = normInput.expandDims();

    // runs the model
    let output = await model.predict(normInput);
    normInput.dispose();

    // reduces to index of max value = class number, as 0 (background) is included
    output = output.squeeze();
    output = output.argMax(2);

    // extracting the list of classes in the output in array classNumbers

    const { values , indices } = tf.unique(tf.reshape(output,[tf.util.sizeFromShape(output.shape)]));
    const classNumbers = values.arraySync();
    // linking the class numbers with the class names, and storing in dictionnary
    const classDict = {};
    for (const classNumber of classNumbers) {
        if (classNumber!==0) classDict[classNumber] = classNames[classNumber-1];
    }

    // returning outputtensor and class dictionary
    return { tensor: output, classes: classDict };

    // Note that:
    // the output is not the same size as the input, but I choose not to resize here, as the tensor contains the class numbers
    // the class name is given, it is up to the client to associate classes with colors to generate the final mask image
    // see tensorToImage
}

/**
 * converts a 2D tensor containing pixel-wise class information to an image, using the provided class colors
 * classColors must contain a least all the classes present in the tensor
 * @param {object} tensor 2d tensor from ESPNet model
 * @param {array} size 
 * @param {object} classColors colors for classes, format: { class_number : [r, g, b], ...}
 * @returns 
 */
async function tensorToImage(tensor,size,classColors) {

        // convert mask to image
        const colors = [[0,0,0,0]]; // initiliaze class 0 (background)
        for (let classNumber = 1; classNumber <= classNames.length; classNumber++) {
            if (classColors.hasOwnProperty(classNumber)) {
                // this class is in the image, copying color code
                colors.push([classColors[classNumber][0], classColors[classNumber][1], classColors[classNumber][2], 255]);
            } else {
                // this class is not in the image
                colors.push([0,0,0,0]);
            }
        }

        // gathering the colors as per class number, and resize image
        let imageTensor = tf.cast(tensor,'int32');
        imageTensor = tf.tensor2d(colors).gather(imageTensor);
        imageTensor = tf.image.resizeNearestNeighbor(imageTensor,[size.height,size.width]);
        imageTensor = tf.cast(imageTensor,'int32');

        let tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = imageTensor.shape[1];
        tmpCanvas.height = imageTensor.shape[0];
        
        
        await tf.browser.toPixels(imageTensor,tmpCanvas);

        return tmpCanvas;
        
        let image = new Image();
        image.src = tmpCanvas.toDataURL();
        return image;
}

export { loadESPNet, imageToTensor, runESPNet, tensorToImage }