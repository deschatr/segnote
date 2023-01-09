import React from 'react';
import { Line } from 'react-konva';
import Point from "./Point";
import MidPoint from './MidPoint';

/**
 * draws a filled closed polygon, will also draw points if isActive
 * midpoints are drawn, but only visible when the pointer is over them
 * points: [x0,y0,x1,y1,etc...]
 * selectable: boolean, default false
 * other konva line props apply: color, fill, stroke, etc...
 * konva props apply for points and midpoints: color, fill, stroke, etc...
 * events supported:
 * - onChange: a point has been moved (dragged)
 */

const Polygon = ({id, points, color, isActive = false, isEditable = false, activePoint, onPointerDown, onMidPointPointerDown, onPointPointerDown}) => {
    const defaultLineProps = { fill: color, stroke: color, strokeWidth: 1, opacity: 0.4, listening: true }
    const activeLineProps = { fill: color, stroke: color, strokeWidth: 1, opacity: 0.6, listening: true }
    
    const pointProps = { radius: 5, hoverRadius: 7, color: color, opacity: 1, listening: true }
    const midPointProps = { radius: 5, hoverRadius: 7, color: color, opacity: 1, listening: true }

    return (
        <>
            <Line points={points} {...(isActive ? activeLineProps : defaultLineProps)} closed={true} onPointerDown={(e) => onPointerDown(e,id)} />
            {   isActive && isEditable &&   
                points.filter( (e,i) => { return i % 2 === 0 }).map( (coord,i) => {
                    const i2 = 2 * i;
                    const point = { x:  coord, y: points[i2+1] }
                    if (points.length >= 4  || (points.length >=2 && i2 > 1)) {
                        let point2;
                        if (i2+2 === points.length) {
                            point2 = { x: points[0], y: points[1] }
                        } else {
                            point2 = { x: points[i2+2], y: points[i2+3] }
                        }
                        return (
                            <MidPoint
                                key={i2}
                                {...midPointProps}
                                point1={point}
                                point2={point2}
                                onPointerDown={ (e) => onMidPointPointerDown(e,i2) }
                                
                            />
                        )
                    }
                })
            }
            {   isActive &&
                points.filter( (e,i)=> { return i % 2 === 0} ).map( (coord,i) => {
                    const i2 = 2 * i;
                    const point = { x: coord, y: points[i2+1] }
                    return (
                        <Point
                            key={i2}
                            {...pointProps}
                            point={point}
                            isActive={activePoint != null && activePoint === i2}
                            onPointerDown={(e) => onPointPointerDown(e,i2)}
                            
                        />
                    )
                })
            }
        </>
    );
}

export default Polygon;