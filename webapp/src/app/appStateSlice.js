import { createSlice } from '@reduxjs/toolkit';
import { nanoid } from 'nanoid';
import { getUnusedColor, countUnusedColors } from './colors';

const maxZoom = 3; // 2^3
const minZoom = -3; // 2^-3

const initialTool = 0;
const initialUIState = 0;
const initialState = {
    tool: initialTool,
    UIState: initialUIState,
    imageFilename: null,
    box: [], polygons: [], classes: [],
    activePolygon: null, activePoint: null, activeClass: null,
    zoomLevel: 0, maskOpacity: 0.5, brushSize: 20, eraserSize: 20,
    classesImported: false, lastError: null
}

/*
box : { points: [x0, y0, ..., x3, y3] }
polygon: { points [x0, y0, ..., xn, yn], classId: classID, color: classColor } // id removed?
class: { id: id, name: name, color: [r, g, b] }
*/

const appStateSlice = createSlice({

    name: 'appState',
    initialState : initialState,

    reducers: {
        setError: (state,action) => {
            // setError(string)
                state.lastError = action.payload
            },
        clearError: (state,action) => {
            // clearError()
                state.lastError = null
            },
        setUIState: (state,action) => {
            // setUIState(number)
                switch (action.payload) {
                    case UIStates.idle:
                        state.polygons=[];
                        state.box = [];
                        state.activePolygon=null;
                        state.activePoint=null;
                    default:
                        state.UIState = action.payload
                }
            },
        setTool: (state,action) => {
            // setTool(number)
                if (action.payload.tool === state.tool) return state;
                switch (state.UIState) {
                    case UIStates.box:
                        state.box = []
                        break;
                    case UIStates.edit:
                        state.activePolygon = null;
                        break;
                    case UIStates.polygon:
                        if (state.activePolygon !== null) {
                            if (state.polygons[state.activePolygon].points.length<4) {
                                // delete polygon
                                state.polygons.splice(state.activePolygon,1);
                                state.activePolygon = null;
                            } else if (action.payload.tool !== tools.edit) {
                                state.activePolygon = null;
                            }
                            state.activePoint = null;
                        }
                        break;
                    default:
                }
                state.tool = action.payload.tool;
                state.UIState = action.payload.tool
            },
        setImageFileName: (state,action) => {
            // setImageFilename(string)
                state.imageFilename = action.payload;
            },
        zoomIn: (state,action) => {
            // zoomIn()
                if (state.zoomLevel < maxZoom) state.zoomLevel++;
            },
        zoomOut: (state,action) => {
            // zoomOut()
                if (state.zoomLevel > minZoom) state.zoomLevel--;
            },
        createBox: (state, action) => {
            // createBox({ point: { x: x, y: y } })
                if (state.UIState === UIStates.box) {
                    state.box = [ action.payload.point.x, action.payload.point.y,
                            action.payload.point.x, action.payload.point.y,
                            action.payload.point.x, action.payload.point.y,
                            action.payload.point.x, action.payload.point.y ];
                    state.UIState = UIStates.boxing;
                    state.activePoint = 2
                } else {
                    console.error(`createBox: trying to create box in state ${state.UIState}.`);
                    return state
                }
            },
        clearBox: (state,action) => {
            // clearBox()
                state.box = []
            },
        clearPolygons: (state, action) => {
            // clearPolygons()
                state.polygons = [];
            },
        createPolygon: (state, action) => {
            // createPolygon( { point: { x: x, y: y }, class: class } )
                switch (state.UIState) {
                    case UIStates.polygon:
                        const points = [action.payload.point.x, action.payload.point.y];
                        state.polygons.unshift({ points: points, classId: action.payload.class.id, color: action.payload.class.color })
                        state.activePolygon = 0;
                        state.activePoint = 0;
                        state.UIState = UIStates.polygoning;
                        break;
                    default:
                        console.error(`createPolygon: trying to create polygon in state ${state.UIState}.`);
                        return state
                }
            },
        updatePolygon: (state, action) => {
            // updatePolygon( { class: class }) 
                switch (state.UIState) {
                    case UIStates.polygon:
                        state.polygons[state.activePolygon].classId = action.payload.class.id;
                        state.polygons[state.activePolygon].color = action.payload.class.color;
                        break;
                    default:
                        console.error(`updatePolygon: trying to update polygon in state ${state.UIState}.`);
                        return state
                }
            },
        deletePolygon: (state, action) => {
            // deletePolygon()
                switch (state.UIState) {
                    case UIStates.edit:
                        if (state.activePolygon !== null) {
                            state.polygons.splice(state.activePolygon,1);
                            state.activePolygon = null
                        } else {
                            console.error("deletePolygon: no activePolygon to delete.");
                            return state
                        }
                        break;
                    case UIStates.polygoning:
                        if (state.activePolygon !== null) {
                            state.polygons.splice(state.activePolygon,1);
                            state.activePolygon = null
                        } else {
                            console.error("deletePolygon: no activePolygon to delete.");
                            return state
                        }
                        break;
                    default:
                        console.error(`deletePolygon: trying to delete polygon in state ${state.UIState}.`);
                        return state
                }
            },
        setActivePolygon: (state,action) => {
            // setActivePolygon( polygonIndex )
                switch (state.UIState) {
                    case UIStates.edit:
                        if (action.payload >= 0 && action.payload < state.polygons.length) {
                            state.activePolygon = action.payload;
                            state.activePoint = null;
                            state.activeClass = state.classes.find( (clss)=> clss.id === state.polygons[state.activePolygon].classId);
                        } else {
                            console.error(`setActivePolygon: polygon doesn't exist, cannot be setActive.`);
                            return state
                        }
                        break;
                    default:
                        console.error(`setActivePolygon: trying to setActivePolygon in state ${state.UIState}.`);
                        return state
                }
            },
        clearActivePolygon: (state,action) => {
            // clearActivePolygon()
                switch (state.UIState) {
                    case UIStates.edit:
                        state.activePolygon = null;
                        state.activePoint = null;
                        break;
                    default:
                        console.error(`clearActivePolygon: trying to clearActivePolygon in state ${state.UIState}.`);
                        return state
                }
            },
        createPoint: (state, action) => {
            // createPoint( { index: optional, point : { x: x, y:y } })
                switch (state.UIState) {
                    case UIStates.edit:
                        if (state.activePolygon !== null) {
                            if (action.payload.hasOwnProperty('index')) {
                                const pointIndex = action.payload.index;
                                if (pointIndex % 2 === 0 && pointIndex >= 0 && pointIndex < state.polygons[state.activePolygon].points.length) {
                                    // adding point after given point in activePolygon                                
                                    state.polygons[state.activePolygon].points.splice(pointIndex + 2,0,action.payload.point.x,action.payload.point.y);
                                    state.activePoint = pointIndex+2
                                    state.UIState = UIStates.editing;
                                } else {
                                    console.error("createPoint: Invalid index in createPoint.");
                                    return state
                                }
                            } else {
                                console.error("createPoint: No index provided to createPoint.")
                                return state
                            }
                        } else {
                            console.error("createPoint: No activePolygon to update point");
                            return state;
                        }
                        break;
                    case UIStates.polygon:
                        if (state.activePolygon !== null) { 
                            if (state.polygons[state.activePolygon].points.length > 1) {
                                // adding point after last point in activePolygon
                                const pointIndex = state.polygons[state.activePolygon].points.length - 2;
                                state.polygons[state.activePolygon].points.splice(pointIndex + 2,0,action.payload.point.x,action.payload.point.y);
                                state.activePoint = pointIndex + 2;
                                state.UIState = UIStates.polygoning;
                            } else {
                                console.error("createPoint: ActivePolygon is empty.")
                                return state;
                            }   
                        } else {
                            console.error("createPoint: No activePolygon to update point");
                            return state;
                        }
                        break;
                    default:
                        console.error(`createPoint: Trying to createPoint in state ${state.UIState}.`);
                        return state;
                }
            },
        updatePoint: (state, action) => {
            // updates the activePoint of the activePolygon, or the activePoint of the selection box
            // updatePoint( { point: { x: x, y: y } } )
                switch (state.UIState) {
                    case (UIStates.boxing):
                        if (state.activePoint !== null) {
                            state.box[state.activePoint] = action.payload.point.x;
                            state.box[state.activePoint+1] = action.payload.point.y;
                            state.box[(state.activePoint+2) % 8] = action.payload.point.x;
                            state.box[(state.activePoint+3) % 8] = state.box[(state.activePoint+5) % 8];
                            state.box[(state.activePoint+6) % 8] = state.box[(state.activePoint+4) % 8];
                            state.box[(state.activePoint+7) % 8] = action.payload.point.y;
                        } else {
                            console.error("updatePoint: No activePoint to update.");
                            return state
                        }
                        break;
                    case (UIStates.editing):
                        if (state.activePolygon !== null && state.activePoint !== null) {
                            state.polygons[state.activePolygon].points[state.activePoint] = action.payload.point.x;
                            state.polygons[state.activePolygon].points[state.activePoint+1] = action.payload.point.y;
                        } else {
                            console.error("updatePoint: No activePolygon or activePoint to update.");
                            return state
                        }
                        break;
                    case (UIStates.polygoning):
                        if (state.activePolygon !== null && state.activePoint !== null) {
                            state.polygons[state.activePolygon].points[state.activePoint] = action.payload.point.x;
                            state.polygons[state.activePolygon].points[state.activePoint + 1] = action.payload.point.y;
                        } else {
                            console.error("updatePoint: No activePolygon or activePoint to update.");
                            return state
                        }
                        break;
                    default:
                        console.error(`updatePoint: Trying to updatePoint in state ${state.UIState}.`);
                        return state
                }
            },
        deletePoint: (state, action) => {
            // deletes activePoint of activePolygon
            // deletePoint()
                switch(state.UIState) {
                    case UIStates.edit:
                        if (state.activePolygon !== null && state.activePoint !== null) {
                            state.polygons[state.activePolygon].points.splice(state.activePoint,2);
                            state.activePoint = null
                        } else {
                            console.error("deletePoint: No activePolygon or activePoint to delete.");
                            return state
                        }
                        break;
                    default:
                        console.error(`deletePoint: trying to delete point in state ${state.UIState}.`);
                        return state
                }
            },
        setActivePoint: (state,action) => {
            // set the point of given index to active, index refers to the x index in the point array for polygon or selection box
            // setActivePoint( index )
                switch (state.UIState) {
                    case UIStates.box:
                        if (action.payload.index >= 0 && action.payload.index < 8 ) {
                            state.UIState = UIStates.boxing;
                            state.activePoint = action.payload.index
                        } else {
                            console.error(`setActivePoint: invalid point index (${action.payload.index}) in setActivePoint`);
                            return state
                        }
                        break;
                    case UIStates.edit:
                        if (state.activePolygon !== null) {
                            if (action.payload.index >= 0 &&
                                    action.payload.index <= state.polygons[state.activePolygon].points.length - 2 &&
                                    action.payload.index % 2 === 0) {
                                state.UIState = UIStates.editing;
                                state.activePoint = action.payload.index
                            } else {
                                console.error("setActivePoint: invalid point index in setActivePoint.");
                                return state
                            }
                        } else {
                            console.error("setActivePoint: No activePolygon to setActivePoint.");
                            return state
                        }
                        break;
                    default:
                        console.error(`setActivePoint: trying to set active point in state ${state.UIState}.`);
                        return state
                }
            },
        setClassesImported: (state,action) => {
            // sets the importedClasses flag
            // setClassesImported(boolean)
                state.classesImported = action.payload;
            },
        importClasses: (state,action) => {
                // create a bunch of classes
                // importClasses([ string , ... ])
                let newClassesNumber = 0;
                for (let className of action.payload) {
                    if (className && !state.classes.find(clss => clss.name === className)) newClassesNumber++;
                }
                
                // create a list of used colors
                const usedColors = [];
                for (const clss of state.classes) usedColors.push(clss.color);
                // iterate through the list of submitted classes to create them

                if (newClassesNumber <= countUnusedColors(usedColors)) {
                    for (let className of action.payload) {
                        if (className.match(/^[A-Z a-z\-]+$/)) {
                            // find an unused color
                            const color = getUnusedColor(usedColors);
                        
                            if (color !== null) {
                                if (className && !state.classes.find(clss => clss.name === className.toLowerCase())) {
                                    // add the color to the list of used colors
                                    usedColors.push(color);
                                    // add the class to the state's class array
                                    state.classes.splice(state.classes.length,1,{ id: nanoid(), name: className.toLowerCase(), color: color });
                                } else {
                                    // a class with that name already exist: ignore
                                }
                            } else {
                                // no more colors...
                                // this cannot happen as we checked that there were enought colors at the start
                            }
                        } else {
                            // invalid class name, ignore
                        }
                    }
                    if (state.activeClass === null) { state.activeClass = state.classes[0] }
                    state.classesImported = true;
                } else {
                    // not enough colors...
                    state.lastError = "There aren't enough colours to import all the classes...";
                }
            },
        createClass: (state, action) => {
            // creates a class
            // createClass({ name: string })
                if (action.payload.name && action.payload.name.match(/^[A-Z a-z\-]+$/)) {
                    // create a list of used colors
                    const usedColors = [];
                    for (const clss of state.classes) usedColors.push(clss.color);
                    // find an unused colot
                    const color = getUnusedColor(usedColors);
                    if (color !== null ) {
                        if (action.payload.name && !state.classes.find(clss => clss.name === action.payload.name.toLowerCase())) {
                            state.classes.splice(state.classes.length,0,{ id: nanoid(), name: action.payload.name.toLowerCase(), color: color });
                            state.activeClass = state.classes[state.classes.length-1]
                        } else {
                            console.error("createClass: a class with the same name already exists");
                            return state;
                        }
                    } else {
                        console.error("createClass: all the colors have been used")
                        return state;
                    }
                } else {
                    console.error("createClass: Invalid class name");
                    return state;
                }
            },
        updateClass: (state, action) => {
            // updates a class
            // updateClass({ name: name })
                if (action.payload.name && action.payload.name.match(/^[A-Z a-z\-]+$/)) {
                    const index = state.classes.findIndex( element => element.id === action.payload.id );
                    if (index >= 0) {
                        const klass = state.classes[index];
                        state.classes.splice(index,1,{ ...klass, name: action.payload.name.toLowerCase()});
                    } else {
                        console.error("updateClass: class not found.");
                        return state
                    }
                } else {
                    console.error("createClass: Invalid class name");
                    return state;
                }
            },
        deleteClass: (state, action) => {
            // deletes a class
            // deleteClass( id )
                const index = state.classes.findIndex( element => element.id === action.payload.id );
                if (index >= 0) {
                    const deletedId = state.classes[index].id;
                    state.classes.splice(index,1);
                    if (state.activeClass === deletedId) {
                        state.activeClass = state.class.length > 0 ? state.classes[0].id : null;
                    }
                    for (let polyIndex=0; polyIndex< state.polygons.length; polyIndex++) {
                        while (polyIndex<state.polygons.length && state.polygons[polyIndex].classId === deletedId) {
                            state.polygons.splice(polyIndex,1);
                        }
                    }
                } else {
                    console.error(`deleteClass: class not found.`);
                    return state
                }
            },
        setActiveClass: (state,action) => {
            // sets the active class
            // setActiveClass( id )
                const klass = state.classes.find( element => element.id === action.payload.id );
                if (klass) {
                    state.activeClass = klass;
                    if (state.activePolygon !== null) {
                        state.polygons[state.activePolygon].classId = klass.id;
                        state.polygons[state.activePolygon].color = klass.color;
                    }
                } else {
                    console.error("setActiveClass: class not found");
                }
            },
        startPainting: (state,action) => {
            // sets the UIState to painting
            // stratPainting()
                state.UIState = UIStates.painting
            },
        finishPainting: (state,action) => {
            // sets the UIState to paint
            // finishPainting()
                state.UIState = UIStates.paint;
            },
        startErasing: (state,action) => {
            // sets the UIState to erasing
            // startErasing()
                state.UIState = UIStates.erasing
            },
        finishErasing: (state,action) => {
            // sets the UIState to erase
            // finishErasing()
                state.UIState = UIStates.erase;
            },
        finishBoxing: (state,action) => {
            // sets the UIState to box, and clears the active point
            // finishBoxing()
                state.activePoint = null;
                state.UIState = UIStates.box
            },
        finishEditing: (state,action) => {
            // sets the UIStates to edit
            // finishEditing()
                state.UIState = UIStates.edit;
            },
        cancelPolygon: (state,action) => {
            // cancels current polygon creation
            // cancelPolygon()
            // remove active polygon
            state.polygons.splice(state.activePolygon,1);
            // set all to inactive
            state.activePolygon = null;
            state.activePoint = null;
            },
        finishPolygon: (state,action) => {
            // set all to inactive
            // finishPolygon()
            state.activePoint = null;
            state.activePolygon = null;
            },
        finishPolygoning: (state,action) => {
            // sets the UIState to polygon, clears active point
            // finishPolygoning
                state.activePoint = null;
                state.UIState = UIStates.polygon;
            },
        toggleMaskOpacity: (state,action) => {
            // toggles opacity
            // toggleMaskOpacity()
                if (state.maskOpacity === 0.5) {
                    state.maskOpacity = 1;
                } else {
                    state.maskOpacity = 0.5;
                }
            },
        setBrushSize: (state,action) => {
            // sets the brush size
            // setBrushSize( number )
            const newSize = action.payload;
            if (typeof newSize === "number") {
                if (newSize < brushSizes.min) state.brushSize = brushSizes.min
                else if (newSize > brushSizes.max) state.brushSize = brushSizes.max;
                else state.brushSize = Math.round(newSize);
            }
        },
        setEraserSize: (state,action) => {
            // sets the eraser size
            // setEraserSize( number )
            const newSize = action.payload;
            if (typeof newSize === "number") {
                if (newSize < eraserSizes.min) state.eraserSize = eraserSizes.min
                else if (newSize > eraserSizes.max) state.eraserSize = eraserSizes.max;
                else state.eraserSize = Math.round(newSize);
            }
        }
    }
})

export const {  setError, clearError,
                setUIState, setTool,
                setImageFileName,
                toggleMaskOpacity,
                setBrushSize, setEraserSize,
                createBox, updateBox, clearBox,
                createPolygon, updatePolygon, deletePolygon, setActivePolygon, clearActivePolygon,
                createPoint, updatePoint, deletePoint, setActivePoint,
                importClasses, createClass, updateClass, deleteClass, setActiveClass, setClassesImported,
                startPainting, paint, finishPainting,
                startErasing, finishErasing,
                finishBoxing, finishEditing,
                cancelPolygon, finishPolygon, finishPolygoning } = appStateSlice.actions;

export const selectAppState = (states) => states.appState;
export const selectError = (states) => states.appState.lastError;
export const selectUIState = (states) => states.appState.UIState;
export const selectTool = (states) => states.appState.tool;
export const selectImageFilename = (states) => states.appState.imageFilename;
export const selectPaintLine = (states) => states.appState.paintLine;
export const selectBox = (states) => states.appState.box;
export const selectPolygons = (states) => states.appState.polygons;
export const selectActivePolygon = (states) => states.appState.activePolygon;
export const selectActivePoint = (states) => states.appState.activePoint;
export const selectClasses = (states) => states.appState.classes;
export const selectActiveClass = (states) => states.appState.activeClass;
export const selectClassesImported = (states) => states.appState.classesImported;
export const selectMaskOpacity = (states) => states.appState.maskOpacity;
export const selectBrushSize = (states) => states.appState.brushSize;
export const selectEraserSize = (states) => states.appState.eraserSize;

// tools available
export const tools = {
                        none: 0,
                        zoomin: 100,
                        zoomout: 200,
                        paint: 300,
                        erase: 400,
                        box: 500,
                        edit: 600,
                        polygon: 700,
                    };

// UIStates available
export const UIStates = {
                            default: 0, idle : 1,
                            zoomIn : 100,
                            zoomOut : 200,
                            paint : 300, painting : 301,
                            erase : 400, erasing : 401,
                            box : 500, boxing : 501,
                            edit : 600, editing : 601,
                            polygon : 700, polygoning : 701,
                        };

// min max and default brush and eraser sizes
export const brushSizes = { min: 2, max: 40, default: 20 };
export const eraserSizes = { min: 2, max: 40, default: 20 };

export default appStateSlice.reducer;