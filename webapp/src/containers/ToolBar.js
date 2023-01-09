import React, { useEffect, useState } from 'react';

import { useSelector, useDispatch } from 'react-redux';
import { setTool, selectTool, tools, toggleMaskOpacity, setBrushSize, brushSizes, selectBrushSize, setEraserSize, eraserSizes, selectEraserSize } from '../app/appStateSlice';

import Title from '../components/Title';
import ToolButton from '../components/ToolButton';
import ActionButton from '../components/ActionButton';
import { Form } from 'react-bootstrap';

/**
 * React container implementing a toolbar containing a title and several action or tool buttons
 * this component does not take any props
 */
const ToolBar = () => {

    const dispatch = useDispatch();
    const tool = useSelector(selectTool);
    const brushSize = useSelector(selectBrushSize);
    const eraserSize = useSelector(selectEraserSize);

    const [brushSizeValue,setBrushSizeValue] = useState();
    const [eraserSizeValue,setEraserSizeValue] = useState();

    /**
     * callback function for the tool buttons to set the active tool
     */
    function setActiveTool(newTool)
    {
        if (newTool !== tool)
        dispatch(setTool({ tool : newTool }));
    }

    function handleOnSizeChange(event) {
        const value = parseInt(event.target.value);
        switch (tool) {
            case tools.paint:
                dispatch(setBrushSize(2*value));
                break;
            case tools.erase:
                dispatch(setEraserSize(2*value));
                break;
            default:
        }
    }

    useEffect( ()=> {
        switch (tool) {
            case tools.paint:
                setBrushSizeValue(Math.floor(brushSize/2));
                break;
            case tools.erase:
                setEraserSizeValue(Math.floor(eraserSize/2));
                break;
            default:
        }
    },[tool,brushSize,eraserSize]);

    const minBrushValue = Math.floor(brushSizes.min / 2);
    const maxBrushValue = Math.floor(brushSizes.max / 2);
    const minEraserValue = Math.floor(eraserSizes.min / 2);
    const maxEraserValue = Math.floor(eraserSizes.max / 2);

    return (
        <>
            <Title text="Tools" />
    
            <ActionButton name="zoomin" icon="fa-circle-half-stroke" action={ ()=> dispatch(toggleMaskOpacity())} toolTip="toggle mask opacity" />
            <ToolButton name="zoomin" icon="fa-magnifying-glass-plus" setTool={setActiveTool} tool={tools.zoomin} isActive={tool && tool === tools.zoomin} toolTip="zoom in" disabled/>
            <ToolButton name="zoomout" icon="fa-magnifying-glass-minus" setTool={setActiveTool} tool={tools.zoomout} isActive={tool && tool === tools.zoomout} toolTip="zoom out" disabled/>

            <ToolButton name="paint" icon="fa-paintbrush" setTool={setActiveTool} tool={tools.paint} isActive={tool && tool === tools.paint} toolTip="paint" />
            <ToolButton name="paint" icon="fa-eraser" setTool={setActiveTool} tool={tools.erase} isActive={tool && tool === tools.erase} toolTip="erase" />
            
            <ToolButton name="box" icon="fa-vector-square" setTool={setActiveTool} tool={tools.box} isActive={tool && tool === tools.box} toolTip="select region" />
            <ToolButton name="polygon" icon="fa-arrow-pointer" setTool={setActiveTool} tool={tools.edit} isActive={tool && tool === tools.edit} toolTip="edit polygon" />
            <ToolButton name="polygon" icon="fa-draw-polygon" setTool={setActiveTool} tool={tools.polygon} isActive={tool && tool === tools.polygon} toolTip="create polygon" />


            { tool === tools.paint &&
                <>
                <Title text="Size" />
                <Form><Form.Range className="p-2" min={minBrushValue} max={maxBrushValue} defaultValue={brushSizeValue} onChange={handleOnSizeChange} /></Form>
                </>
            }

            { tool === tools.erase &&
                <>
                <Title text="Size" />
                <Form.Range className="p-2" min={minEraserValue} max={maxEraserValue} defaultValue={eraserSizeValue} onChange={handleOnSizeChange} />
                </>
            }  
                
        </>
    )
}

export default ToolBar;