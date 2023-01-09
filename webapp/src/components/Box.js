import React, { useEffect } from "react";
import { Line } from "react-konva";
import Point from "./Point";

/**
 * React component rendering a filled rectangle with 4 corners
 * points array of points [x0,y0,x1,y1,... x3,y3]
 * color konva color definition
 * onPointPointerDown callback function called on pointer down on a corner event
 */
const Box = ({ points, color, onPointPointerDown }) => {
    const lineProps = { fill: color, stroke: color, strokeWidth: 1, opacity: 0.4, listening: true }
    const pointProps = { radius: 5, hoverRadius: 7, color: color, opacity: 1, listening: true }

    useEffect( () => {

    },[points]);

    return (
        <>
            <Line points={points} {...lineProps} closed={true} />
            {   points.filter( (e,i) => { return i % 2 === 0 }).map( (coord,i) => {
                    const i2 = 2 * i;
                        const point = { x: coord, y: points[i2+1] }
                        return (
                            <Point
                                key={i2}
                                {...pointProps}
                                point={point}
                                isSelected={false}
                                onPointerDown={(e) => onPointPointerDown(e,i2)}
                            />
                        )
                })
            }
        </>
    );
}

export default Box;