import React from 'react';
import Card from 'react-bootstrap/Card';
import CloseButton from 'react-bootstrap/CloseButton';

/**
 * React component rendering a class card for a single class in the sidepanel
 * name string class name
 * color [r,g,b]
 * selected boolean
 * onClick callback on click
 * onClose callback on close
 */
const ClassCard = ( { name, color, selected, onClick, onClose } ) => {
    return (
        <Card className="m-1 p-1" bg={selected ? "secondary" : "light" } >
            <Card.Body className="m-0 p-1" onClick={ onClick } style={{ userSelect: "none" }}>
                {name}
                <div className="colorsample" style={ { backgroundColor: "rgb(" + color[0] + "," + color[1] + "," + color[2] + ")" } } />
                <CloseButton className="closebutton" onClick={ onClose }/>
            </Card.Body>
        </Card>
    )
}

export default ClassCard;