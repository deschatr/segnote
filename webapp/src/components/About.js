import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
/**
 * returns a modal with the About information
 * show is a boolean true= shown, false = hidden
 * onClose is a callback function that is called when the modal is being closed
 */
const About = ({show, onClose}) => {
    return (
        <Modal show={show} onHide={onClose}>
            <Modal.Header>
                <Modal.Title>About</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p>SegNote version 1.0.0</p>
                <p>September 2022</p>
                <p>by Nicolas Deschatrettes</p>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="primary" onClick={onClose}>
                    Ok
                </Button>
            </Modal.Footer>
        </Modal>
    );
}

export default About;