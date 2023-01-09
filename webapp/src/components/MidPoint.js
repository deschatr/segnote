import React,{useState} from 'react';
import {Circle} from 'react-konva';

/**
 * React component rendering a point at the middle of a polygon side
 * point1, point2 {x: x, y:y} the start and end of the polygon side
 * color: konva color
 * opacity: konva opacity
 * onPointerDown: callback on pointer down
 */
const MidPoint = ({ point1, point2, color, opacity, onPointerDown }) => {

    const [ pointerOver, setPointerOver ] = useState(false);

    // if the pointer is not over the middle point, the circle is drawn with null color and is invisible
    // another way to do this would be to use opacity = 0
    const defaultProps = { radius: 5, stroke: null, fill: null, strokeWidth: 1, opacity: opacity };
    const pointerOverProps = { radius: 5, stroke: color, fill: color, strokeWidth: 1, opacity: opacity };

    // calculates the coordinates
    const x = (point1.x + point2.x) / 2;
    const y = (point1.y + point2.y) / 2;

    // pointerOver must be set to false otherwise the point still shows after being clicked
    function handleOnPointerDown(event) {
        setPointerOver(false);
        onPointerDown(event);
    }

    return <Circle
        x={ x }
        y={ y }
        {...pointerOver ? pointerOverProps: defaultProps}
        onPointerOver={ ()=> { if (!pointerOver) setPointerOver(true) }}
        onPointerOut={ ()=> { if (pointerOver) setPointerOver(false) }}
        onPointerDown = { handleOnPointerDown }
    />
}

export default MidPoint