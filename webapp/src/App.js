import React, { useState, useRef, useEffect } from 'react';

import 'bootstrap/dist/css/bootstrap.min.css';

// import react-konva components
import { Stage, Layer, Circle, Image as KonvaImage } from 'react-konva';

// import font-awsome components and icons
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { faFolderOpen, faFloppyDisk, faArrowPointer, faHand, faMagnifyingGlassMinus, faMagnifyingGlassPlus,
        faVectorSquare, faDrawPolygon, faPenToSquare, faSquareFull, faObjectGroup
} from '@fortawesome/free-solid-svg-icons';

import './App.css';

// import redux reducers
import { useSelector, useDispatch } from 'react-redux';
import {    selectError, setError, clearError,
            UIStates, selectUIState, setUIState,
            setImageFileName, selectImageFilename,
            selectMaskOpacity,
            selectBrushSize, selectEraserSize,
            selectBox, createBox, clearBox,
            selectPolygons, createPolygon, updatePolygon, deletePolygon,
            selectActivePolygon, setActivePolygon, clearActivePolygon,
            createPoint, updatePoint, deletePoint,
            selectActivePoint, setActivePoint,
            selectClasses, importClasses, selectClassesImported, setClassesImported, selectActiveClass,
            startPainting, paint, finishPainting,
            startErasing, finishErasing,
            finishEditing, finishBoxing,
            cancelPolygon, finishPolygon, finishPolygoning  } from './app/appStateSlice';

// importing App components
import MenuBar from './containers/MenuBar';
import ToolBar from './containers/ToolBar';
import SidePanel from './containers/SidePanel';

import Error from './components/Error';
import Polygon from './components/Polygon';
import Box from './components/Box';

// import tensorflow library, webgl backend and deeplab model
import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs-core';
import { imageToTensor, loadESPNet, runESPNet, tensorToImage } from './model/ESPNet';

// adding font-awsome icons to library
library.add(fas, faFolderOpen, faFloppyDisk, faArrowPointer, faHand, faMagnifyingGlassMinus, faMagnifyingGlassPlus,
    faVectorSquare, faDrawPolygon, faPenToSquare, faSquareFull, faObjectGroup);

/**
 * async function to run ESPNet model
 */
const runModel = async (inputImage) => {
     // load ESPNET model
    const model = await loadESPNet("espnet/model.json");
     // pre-process the image, convert to tensor
    const inputTensor = await imageToTensor(inputImage);
    //await tf.nextFrame();
     // run the model prediction
    const output = await runESPNet(model, inputTensor);
     // dispose of model to free memory
    model.dispose();
    return output;
}

/**
 * async function to convert an image to a mask for the given classes
 * this is CPU intensive, and wouldbenefit from being moved to a web worker
 */
const imageToMask = async (canvasIn,classes) => {
    // create output canvas
    const canvasOut = document.createElement('canvas');
    canvasOut.width = canvasIn.width;
    canvasOut.height = canvasIn.height;

    // get contexts for input and output canvas
    const ctxIn = canvasIn.getContext('2d');
    const ctxOut = canvasOut.getContext('2d');

    // scan all the pixels...
    for (let x = 0; x < canvasIn.width; x++) {
        for (let y = 0; y < canvasIn.height; y++) {
            const pixel = ctxIn.getImageData(x,y,1,1);
            // pixel.data[0][1][2] = RGB
            // find class that corresponds to color
            if (pixel.data[3] === 0) {
                // background pixel
                pixel.data[0] = 0; pixel.data[1] = 0; pixel.data[2] = 0; pixel.data[3] = 0;
            } else {
                const classIndex = classes.findIndex( (clss) => clss.color[0] === pixel.data[0] && clss.color[1] === pixel.data[1] && clss.color[2] === pixel.data[2]);
                if (classIndex < 0) {
                    // could not find a class that corresponds to the pixel color
                    pixel.data[0] = 0; pixel.data[1] = 0; pixel.data[2] = 0; pixel.data[3] = 0;
                } else {
                    // found a class
                    // get class index -> that is the class number
                    pixel.data[0]=classIndex + 1; pixel.data[1]=classIndex + 1; pixel.data[2]=classIndex + 1; pixel.data[3]=255;
                    // insert the rgb=(index,index,index) in outputData
                }
            }
            // set the RGB data into the output canvas at the pixel location
            ctxOut.putImageData(pixel,x,y);
        }
    }
    return canvasOut;
}

function App() {

    // app state dispatch and selectors
    const dispatch = useDispatch();
    const error = useSelector(selectError);
    const imageFilename = useSelector(selectImageFilename);
    const maskOpacity = useSelector(selectMaskOpacity);
    const brushSize = useSelector(selectBrushSize);
    const eraserSize = useSelector(selectEraserSize);
    const UIState = useSelector(selectUIState);
    const box = useSelector(selectBox);
    const polygons = useSelector(selectPolygons);
    const activePolygon = useSelector(selectActivePolygon);
    const activePoint = useSelector(selectActivePoint);
    const classes = useSelector(selectClasses);
    const activeClass = useSelector(selectActiveClass);
    const classesImported = useSelector(selectClassesImported);

    // state and ref variables
    const [image,setImage] = useState(undefined);
    const [maskImage, setMaskImage] = useState(undefined);
    const maskImagePosition = useRef();
    const maskCanvas = useRef();
    const maskCanvasContext = useRef();
    const [classesToImport,setClassesToImport] = useState(undefined);
    const segmentationResult = useRef(undefined);
    const [pointerPosition, setPointerPosition] = useState({ x: 0, y: 0 });
    const lastPointerPos = useRef();
    
    // reference for layers on work area
    const stageRef = useRef(undefined);
    const imageLayerRef = useRef();
    const maskLayerRef = useRef();
    const polyLayerRef = useRef();

    // references to sections of the page
    const menuBarContainerRef = useRef();
    const toolBarContainerRef = useRef();
    const sidePanelContainerRef = useRef();
    const worksheetContainerRef = useRef();

    const [polyLayerListening,setPolyLayerListening] = useState(false);
    
    /**
     * function to open an image from the file system
     */
    function openImage() {
        // creates input HTML element
        let input = document.createElement('input');
        input.type = 'file';
        input.accept = "image/*";
        // create event handler to capture click
        input.onchange = _this =>
            {
                // get image file name, create image
                setImage(undefined);
                const file = input.files[0];
                const imageLoaded = new Image();
                // create event listener for image onLoad
                imageLoaded.addEventListener(
                    'load', () => {
                        // reset maskCanvas
                        maskCanvas.current = document.createElement('canvas');
                        maskCanvas.current.width = imageLoaded.width;
                        maskCanvas.current.height = imageLoaded.height;
                        setUIState(UIStates.idle);
                        // set state variable image to the loaded image
                        // redux will not accept an Image(), unless it's converted to base64
                        // here the image is stored as a state variable
                        setImage(imageLoaded);
                    }
                );
                imageLoaded.addEventListener(
                    'error', () => {
                        // if an error occurs, display message
                        dispatch(setError("The image could not be opened."));
                    }
                )
                // sets the file name with png extension for the mask
                dispatch(setImageFileName(file.name.replace(/\.[^.]+$/, '.png')));
                imageLoaded.src = URL.createObjectURL(file);
            }
        input.click();
    }

    /**
     * imports classes from JSON file
     */
    function importClassesFromFile() {
        let input = document.createElement('input');
        input.type = 'file';
        input.accept = "application/JSON";
        input.onchange = _this =>
            {
                // gets the filename from the open file dialog
                const file = input.files[0];
                fetch( URL.createObjectURL(file) ) // create URL, gets response
                .then( (response) => { if (response) return response.json() } ) // gets JSON from response
                .then( (data) => {
                        // if the data is an array of strings, import
                        if (Array.isArray(data) && data.findIndex( element=> typeof element !== 'string') < 0) dispatch(importClasses(data))
                        else dispatch(setError("The file format is incorrect."))
                    }
                )
                .catch( (error) => dispatch(setError("The file format is incorrect")) );
            }
        input.click();
    }

    /**
     * exports class list to JSON file
     */
    function exportClasses() {
        if (classes.length === 0) {
            dispatch(setError("There is no class to export."));
        } else {
            // creates an array of class names
            const classNameArray = [];
            for (let cIndex = 0; cIndex < classes.length; cIndex++) {
                classNameArray.push(classes[cIndex].name);
            }
            // converts to JSON
            const classNameJson = JSON.stringify(classNameArray);

            // create file link
            var link = document.createElement('a');
            link.download = "classes.json";
            // create file
            const fileBlob = new Blob([classNameJson], { type: 'application/octet-binary' });
            link.href = URL.createObjectURL(fileBlob);
            // trigger download
            link.click();
            // revoke URL object
            URL.revokeObjectURL(link.href);
        }
    }

    /**
     * export annotations to file
     */
    function saveAnnotations() {
        // create input canvas
        const canvasIn = document.createElement('canvas');
        canvasIn.width = image.width;
        canvasIn.height = image.height;

        // copy maskCanvas to input canvas
        const ctxIn = canvasIn.getContext('2d');
        ctxIn.drawImage(maskCanvas.current,0,0);

        // draw all polygosn to input canvas
        for (const polygon of polygons) {
            ctxIn.fillStyle = `rgb(${polygon.color[0]},${polygon.color[1]},${polygon.color[2]})`;
            ctxIn.beginPath();
            ctxIn.moveTo(polygon.points[0],polygon.points[1]);
            for (let ptIndex=0; ptIndex < (polygon.points.length/2); ptIndex++) {
                ctxIn.lineTo(polygon.points[2*ptIndex],polygon.points[2*ptIndex+1])
            }
            ctxIn.closePath();
            ctxIn.fill();
        }

        // create output canvas
        const canvasOut = document.createElement('canvas');
        canvasOut.width = image.width;
        canvasOut.height = image.height;

        imageToMask(canvasIn,classes)
            .then(
                (canvasOut) => {
                    canvasOut.toBlob( (blob) => {
                        const url = URL.createObjectURL(blob);
                        var link = document.createElement('a');
                        link.download = imageFilename;
                        link.href = url;
                        link.click();
                        URL.revokeObjectURL(url);
                    } );
                }
            );
    }

    /**
     * segment image
     */
    function segmentImage() {
        if (image) { 
            // output is { tensor: tensor, classes: [{ number: name }] }
            runModel(image)
            .then((result) => {
                    // segmentationResult.current = { tensor: tensor, classes: [{number: name}], width: image.width, height: image.height };
                    segmentationResult.current = result;
                    maskImagePosition.current = { top: 0, left: 0 };
                    segmentationResult.current.width = image.width;
                    segmentationResult.current.height = image.height;
                    // creates class list from segmentation result
                    const classList = [];
                    for (const classNumber in segmentationResult.current.classes) {
                        classList.push(segmentationResult.current.classes[classNumber]);
                    }
                    // triggers class import
                    setClassesImported(false);
                    dispatch(importClasses(classList));
                }
            );
        } else {
            dispatch(setError("Open an image before segmenting."));
        }
    }

    /**
     * segment selection box
     */
    function segmentBox() {
        if (box.length === 8) {
            // if a box exists, get dimensions
            const xMin = Math.min(box[0],box[2],box[4]);
            const xMax = Math.max(box[0],box[2],box[4]);
            const yMin = Math.min(box[1],box[3],box[5]);
            const yMax = Math.max(box[1],box[3],box[5]);

            if ((xMax-xMin)>8 && (yMax-yMin)>8) {
                // create canvas to capture content of the box
                const boxCanvas = document.createElement('canvas');
                boxCanvas.width = xMax - xMin;
                boxCanvas.height = yMax - yMin;
                maskImagePosition.current = { left: xMin, top: yMin }

                // creates canvas to extract selection content
                const ctx = boxCanvas.getContext('2d');
                ctx.drawImage(image,xMin,yMin,boxCanvas.width,boxCanvas.height,0,0,boxCanvas.width,boxCanvas.height);

                // runs the model
                runModel(boxCanvas)
                .then((result) => {
                        // output is { tensor: tensor, classes: [{ number: name }] }
                        segmentationResult.current = result;
                        segmentationResult.current.width = boxCanvas.width;
                        segmentationResult.current.height = boxCanvas.height;
                        //segmentationResult.current = { tensor: tensor, classes: [{number: name}], width: mask.width, height: mask.height };
                        // build list of classes
                        const classList = [];
                        for (const classNumber in segmentationResult.current.classes) {
                            classList.push(segmentationResult.current.classes[classNumber]);
                        }   
                        // import classes, set flag for class import
                        setClassesImported(false);
                        dispatch(importClasses(classList));
                    }
                );
            } else {
                dispatch(setError("The selected region is too small."));    
            }
        } else {
            dispatch(setError("Open an image and select a region before segmenting."));
        }
    }

    /**
     * handles pointer down on stage events
     */
    function handleStageOnPointerDown(event) {
        function distSquare(p0,p1) { return (p1.x-p0.x)**2+(p1.y-p0.y)**2 }
        const pointerPos = stageRef.current.getPointerPosition();
        switch (UIState) {
            case UIStates.box:
                dispatch(createBox({ point: { x: pointerPos.x, y: pointerPos.y } }));
                break;
            case UIStates.paint:
                if (activeClass) {
                    // record point and start painting
                    maskCanvasContext.current = maskCanvas.current.getContext('2d');
                    maskCanvasContext.current.strokeStyle = `rgb( ${activeClass.color[0]}, ${activeClass.color[1]}, ${activeClass.color[2]})`;
                    maskCanvasContext.current.fillStyle = `rgb( ${activeClass.color[0]}, ${activeClass.color[1]}, ${activeClass.color[2]})`;
                    maskCanvasContext.current.lineJoin = 'round';
                    maskCanvasContext.current.lineWidth = brushSize;
                    maskCanvasContext.current.globalCompositeOperation = 'source-over';
                    lastPointerPos.current = pointerPos;
                    maskCanvasContext.current.beginPath();
                    maskCanvasContext.current.arc(lastPointerPos.current.x, lastPointerPos.current.y,brushSize/2,0,2*Math.PI);
                    maskCanvasContext.current.fill();
                    maskLayerRef.current.draw();
                    dispatch(startPainting());
                } else {
                    dispatch(setError("Please select a class before annotating."));
                }
                break;
            case UIStates.erase:
                maskCanvasContext.current = maskCanvas.current.getContext('2d');
                maskCanvasContext.current.strokeStyle = '#000000';
                maskCanvasContext.current.lineJoin = 'round';
                maskCanvasContext.current.lineWidth = eraserSize;
                maskCanvasContext.current.globalCompositeOperation = 'destination-out';
                lastPointerPos.current = pointerPos;
                maskCanvasContext.current.beginPath();
                maskCanvasContext.current.arc(lastPointerPos.current.x, lastPointerPos.current.y,eraserSize/2,0,2*Math.PI);
                maskCanvasContext.current.fill();
                maskLayerRef.current.draw();
                maskCanvasContext.current.globalCompositeOperation = 'source-over';
                dispatch(startErasing());
                break;
            case UIStates.edit:
                dispatch(clearActivePolygon());
                break;
            case UIStates.polygon:
                if (activePolygon === null) {
                    if (activeClass) {
                        dispatch(createPolygon({ point: { x: pointerPos.x, y: pointerPos.y }, class: activeClass }));
                    } else {
                        dispatch(setError("Please select a class before annotating."));
                    }
                } else {
                    const firstPoint = { x: polygons[activePolygon].points[0], y: polygons[activePolygon].points[1] }
                    if ( distSquare(pointerPos,firstPoint) < 25) {
                        dispatch(finishPolygon())
                    } else {
                        dispatch(createPoint());
                    }
                }
                break;
            case UIStates.zoomIn:
                break;
            case UIStates.zoomOut:
                break;
            default:
        }
    }

    /**
     * handles pointer down on polygon events
     */
    function handleOnPolyPointerDown(event, id) {
        console.log("handleOnPolyPointerDown");
        switch (UIState) {
            case UIStates.edit:
                dispatch(setActivePolygon(id));
                event.cancelBubble = true;
                break;
            default:
        }
    }

    /**
     * handles pointer down on point events
     */
    function handleOnPointPointerDown(event, index) {
        switch (UIState) {
            case UIStates.box:
            case UIStates.edit:
                event.cancelBubble = true;
                dispatch(setActivePoint({index: index}));
                break;
            case UIStates.polygon:
                break;
            default:
        }
    }

    /**
     * handles pointer down on mid-point events
     */
    function handleOnMidPointPointerDown(event, index) {
        const pointerPos = stageRef.current.getPointerPosition();
        event.cancelBubble = true;
        dispatch(createPoint({ index: index, point: { x: pointerPos.x, y: pointerPos.y } }))
    }

    /**
     * handles pointer move on stage events
     */
    function handleStageOnPointerMove(event) {
        const pointerPos = stageRef.current.getPointerPosition();
        switch (UIState) {
            case UIStates.erase:
            case UIStates.paint:
                setPointerPosition(pointerPos)
                break;
            case UIStates.painting:
                maskCanvasContext.current.beginPath();
                maskCanvasContext.current.moveTo(lastPointerPos.current.x, lastPointerPos.current.y);
                lastPointerPos.current = stageRef.current.getPointerPosition();
                maskCanvasContext.current.lineTo(lastPointerPos.current.x, lastPointerPos.current.y);
                maskCanvasContext.current.closePath();
                maskCanvasContext.current.stroke();
                maskLayerRef.current.draw();
                break;
            case UIStates.erasing:
                setPointerPosition(pointerPos);
                maskCanvasContext.current.globalCompositeOperation = 'destination-out';
                maskCanvasContext.current.beginPath();
                maskCanvasContext.current.moveTo(lastPointerPos.current.x, lastPointerPos.current.y);
                lastPointerPos.current = pointerPos;
                maskCanvasContext.current.lineTo(lastPointerPos.current.x, lastPointerPos.current.y);
                maskCanvasContext.current.closePath();
                maskCanvasContext.current.stroke();
                maskLayerRef.current.draw();
                maskCanvasContext.current.globalCompositeOperation = 'source-over';
                break;
            case UIStates.boxing:
                dispatch(updatePoint( { point: {  x: pointerPos.x, y: pointerPos.y } }));
                break;
            case UIStates.editing:
                dispatch(updatePoint( { point: { x: pointerPos.x, y: pointerPos.y } }));
                break;
            case UIStates.polygoning:
                dispatch(updatePoint( { point: { x: pointerPos.x, y: pointerPos.y } }));
                break;
            default:
        }
    }

    /**
     * handles pointer up events
     */
    function handleOnPointerUp(event) {
        switch (UIState) {
            case UIStates.boxing:
                dispatch(finishBoxing());
                break;
            case UIStates.painting:
                dispatch(finishPainting());
                break;
            case UIStates.erasing:
                dispatch(finishErasing());
                break;
            case UIStates.editing:
                dispatch(finishEditing());
                break;
            case UIStates.polygoning:
                dispatch(finishPolygoning());
                break;
            default:
        }
    }

    /**
     * handles key down events
     */
    function handleOnKeyDown(event) {
        switch (UIState) {
            case UIStates.box: // del
                switch (event.key) {
                    case 'Delete':
                        dispatch(clearBox());
                        break;
                    default: 
                }
                break;
            case UIStates.edit: // del
                switch (event.key) {
                    case 'Delete':
                        if (activePoint === null) dispatch(deletePolygon())
                        else dispatch(deletePoint());
                        break;
                    default: 
                }
                break;
            case UIStates.polygon: // esc
                switch (event.key) {
                    case 'Escape':
                        dispatch(cancelPolygon());
                        break;
                    default:
                }
                break;
            default:
        }
    }

    /**
     * add and remove events listeners on every render
     */
    useEffect( () => {
        window.addEventListener("keydown", handleOnKeyDown);
        window.addEventListener("pointerup", handleOnPointerUp);
        return () => {
            window.removeEventListener("keydown", handleOnKeyDown);
            window.removeEventListener("pointerup", handleOnPointerUp);
        }
    })

    /**
     * sets maskCanvas on first render
     */
    useEffect( ()=> {
        maskCanvas.current = document.createElement('canvas');
    },[])

    /**
     * handles specific operations when UIState changes
     */
    useEffect( ()=> {
        switch (UIState) {
            case UIStates.edit:
            case UIStates.editing:
            case UIStates.polygoning:
            case UIStates.polygon:
                setPolyLayerListening(true);
                break;
            default:
                setPolyLayerListening(false);
        }
    },[UIState])

    /**
     * performs operations after classes are imported following a segmentation
     */
    useEffect( ()=>{
        if (classesImported && segmentationResult.current) {
            // 1. create a list of classes with their colors
            const classColors = {};
            for (const classNumber in segmentationResult.current.classes) {
                const classColor = classes.find( (clss) => clss.name === segmentationResult.current.classes[classNumber] ).color;
                classColors[classNumber] = classColor.slice();
            }
            // 2. call tensorToImage
            const size = { height: segmentationResult.current.height, width: segmentationResult.current.width };
            tensorToImage(segmentationResult.current.tensor,size,classColors).then( (outputImage) => {
                setMaskImage(outputImage);
            });
            // 3. copy mask image to canvas
            // 4. remove classesImported flag
            segmentationResult.current = undefined;
            dispatch(setClassesImported(false));
        }
    },[classesImported])

    /**
     * performs operations following an update of maskImage
     */
    useEffect( ()=>{
        if (maskImage) {
            // copy maskImage to the maskLayer
            const ctx = maskCanvas.current.getContext('2d');
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(maskImage,maskImagePosition.current.left,maskImagePosition.current.top);
            maskLayerRef.current.draw();
        }
    },[maskImage] );

    /**
     * performs operations when there are classes to import
     */
    useEffect( ()=> {
        if (classesToImport) {
            // sends classes to import to the redux store, and clears the flag
            dispatch(importClasses(classesToImport));
            setClassesToImport(undefined);
        }
    },[classesToImport]);

    const menuBarHeight = "54px";
    const toolBarWidth = "62px";
    const sidePanelWidth = "200px";
    const worksheetInset = menuBarHeight + " " + sidePanelWidth + " 0px " + toolBarWidth;

    return (
        
            <div className="App">

                <Error message={error} show={error !== null} onClose={ ()=> { dispatch(clearError()) }} />

                <div ref={menuBarContainerRef} className="bg-light px-3 py-0 menubar" style={{top: "0px", left:"0px", right:"0px", height: menuBarHeight}}>
                    <MenuBar
                        openImage={openImage}
                        importClasses={importClassesFromFile}
                        exportClasses={exportClasses}
                        exportAnnotations={saveAnnotations}
                        segmentImage={segmentImage}
                        segmentBox={segmentBox}
                    />
                </div>

                <div ref={toolBarContainerRef} className="bg-light toolbar" style={{position: "absolute", left: "0px", top: menuBarHeight, width: toolBarWidth, bottom: "0px"}}>
                    <ToolBar />
                </div>

                <div ref={sidePanelContainerRef} className="bg-light sidepanel" style={{position: "absolute", right: "0px", top: menuBarHeight, width: sidePanelWidth, bottom: "0px"}}>
                    <SidePanel />
                </div>
                    
                <div ref={worksheetContainerRef} className="worksheet" style={{ position: "absolute", inset: worksheetInset, overflow: "auto"}}>
                    { image && 
                        <Stage
                            width={ image.width }
                            height={ image.height }
                            ref={ stageRef }
                            
                            onPointerDown={ handleStageOnPointerDown }
                            onPointerMove = { handleStageOnPointerMove }
                        >
                            <Layer ref={imageLayerRef} >
                                <KonvaImage image={image}  width={image.width} height={image.height} />
                            </Layer>

                            { polyLayerListening && <Layer ref={maskLayerRef} >
                                <KonvaImage image={maskCanvas.current}  width={image.width} height={image.height} opacity={maskOpacity} clearBeforeDraw={false} />
                                {
                                    ( UIState === UIStates.paint || UIState === UIStates.erase || UIState === UIStates.erasing ) &&
                                    <Circle x={pointerPosition.x} y={pointerPosition.y} radius={9} stroke={"black"} strokeWidth={1} />
                                }
                                { box.length > 0 && <Box points={box} color={"black"} onPointPointerDown={handleOnPointPointerDown}/> }
                            </Layer>}

                            <Layer ref={polyLayerRef} listening={polyLayerListening}>
                                { polygons.map( (polygon,i) => {
                                    if ( i !== activePolygon )
                                    return <Polygon
                                        key={i}
                                        id={i}
                                        points={polygon.points}
                                        color = {`rgb(${polygon.color[0]},${polygon.color[1]},${polygon.color[2]})`}
                                        isActive = {false}
                                        activePoint = { activePoint }
                                        onPointerDown={ handleOnPolyPointerDown }
                                        onPointPointerDown={ handleOnPointPointerDown }
                                        onMidPointPointerDown={ handleOnMidPointPointerDown }
                                    />
                                }) }
                                { activePolygon != null && 
                                    <Polygon
                                        key={activePolygon}
                                        id={activePolygon}
                                        points={polygons[activePolygon].points}
                                        color = {`rgb(${polygons[activePolygon].color[0]},${polygons[activePolygon].color[1]},${polygons[activePolygon].color[2]})`}
                                        isActive = { true }
                                        isEditable = { UIState === UIStates.edit }
                                        activePoint = { activePoint }
                                        onPointerDown={ handleOnPolyPointerDown }
                                        onPointPointerDown={ handleOnPointPointerDown }
                                        onMidPointPointerDown={ handleOnMidPointPointerDown }
                                    />
                                }
                                
                            </Layer>

                            { !polyLayerListening && <Layer ref={maskLayerRef} >
                                <KonvaImage image={maskCanvas.current}  width={image.width} height={image.height} opacity={maskOpacity} />
                                {
                                    UIState === UIStates.paint &&
                                    <Circle x={pointerPosition.x} y={pointerPosition.y} radius={Math.floor(brushSize/2)} stroke="black" strokeWidth={1} />
                                }
                                {
                                    ( UIState === UIStates.erase || UIState === UIStates.erasing ) &&
                                    <Circle x={pointerPosition.x} y={pointerPosition.y} radius={Math.floor(eraserSize/2)} stroke="black" strokeWidth={1} />
                                }
                                { box.length > 0 && <Box points={box} color={"black"} onPointPointerDown={handleOnPointPointerDown}/> }
                            </Layer>}

                        </Stage>
                    }
                </div>

            </div>
    );
}

export default App