
import React from 'react';
import { Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

/**
 * renders a button with an icon in it
 * icon is a string
 * action is a callback function, called when on button down event
 */

const ActionButton = ({action,icon,toolTip,disabled}) => {
    return (
            <Button data-toggle="tooltip" title={toolTip} variant="light" onMouseDown={action} style={{ width: 48, boxShadow: "none", outline: "none" }} disabled={disabled}>
                <FontAwesomeIcon icon={icon} size="xl" />
            </Button>
    )
}

export default ActionButton;