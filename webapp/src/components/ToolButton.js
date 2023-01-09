import React from 'react';
import { Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

/**
 * renders a button with an icon in it
 * icon (string)
 * isActive (boolean) theme changes from btn-dark (true) to btn-light (false)
 * activates tool through callback function setTool  
 */
const ToolButton = ({setTool,icon,tool,isActive,toolTip,disabled}) => {
    return (
            <Button data-toggle="tooltip" title={toolTip} className="m-1 px-0 py-1" variant={isActive ? "dark" : "light"} onMouseDown={ () => setTool(tool) } style={{ width: 54, boxShadow: "none" }} disabled={disabled} >
                <FontAwesomeIcon icon={icon} size="xl" />
            </Button>
    )
}

export default ToolButton;