import React,{useState} from 'react';
import {Circle} from 'react-konva';

/**
 * React component rendering a point at the middle of a polygon side
 * point {x: x, y:y} the start and end of the polygon side
 * color: konva color
 * opacity: konva opacity
 * isActive: boolean
 * onPointerDown: callback on pointer down
 */
const Point = ({ point, color, opacity, isActive, onPointerDown }) => {
    const [ pointerOver, setPointerOver ] = useState(false);

    const defaultProps = { radius: 5, stroke: color, fill: null, strokeWidth: 1, opacity: opacity };
    const pointerOverProps = { radius: 5, stroke: color, fill: color, strokewidth: 1, opacity: opacity };
    const selectedProps = { radius: 5, stroke: color, fill: color, strokewidth: 1, opacity: opacity };

    return <Circle
        x={point.x}
        y={point.y}
        {...(isActive ? selectedProps : (pointerOver ? pointerOverProps: defaultProps))}
        onPointerDown = { onPointerDown }
        onPointerOver={ ()=> { if (!pointerOver) setPointerOver(true) }}
        onPointerLeave={ ()=> setPointerOver(false) }
    />
}

export default Point;