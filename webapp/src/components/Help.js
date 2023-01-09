import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Button from 'react-bootstrap/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

/**
 * returns a modal with the tabulated Help section
 * show is a boolean true= shown, false = hidden
 * onClose is a callback function that is called when the modal is being closed
 */
const Help = ({show, onClose}) => {
    return (
        <Modal show={show} onHide={onClose}>
            <Modal.Header>
                <Modal.Title>Help</Modal.Title>
            </Modal.Header>
            <Modal.Body>

                <Tabs defaultActiveKey="workflow" className="mb-3">
                    <Tab eventKey="workflow"title="Workflow">
                        
                        <p>In order to annotate images with Segnote, follow this workflow:
                            <ol type="1">
                                <li>create classes (side panel) or import classes (File menu)</li>
                                <li>open an image to annotate (File menu)</li>
                                <li>create annotation by painting ( <FontAwesomeIcon icon="fa-paintbrush" size="xl" /> ),
                                    or creating regions with the polygon tool ( <FontAwesomeIcon icon="fa-draw-polygon" size="xl" /> )</li>
                                <li>export your annotations (File menu)</li>
                                <li>repeat steps 2 to 4 for other images</li>
                            </ol>
                        </p>
                        <p>Alternatively:
                            <ol type="1">
                                <li>open an image</li>
                                <li>use the automated segmentation tool (Tools/Segment image)</li>
                                <li>resume above workflow at step 3</li>
                            </ol>
                        </p>
                    </Tab>
                    <Tab eventKey="classes" title="Classes">
                        <p>With the side-panel you can:
                            <ol type="1">
                                <li>create a class by clicking on the '+'' sign<br></br>
                                    (class colors are selected automatically)</li>
                                <li>select the active class by clicking on a class</li> 
                                <li>update the active class by clicking on it</li>
                                <li>delete a class by clicking on the 'x' sign</li>
                            </ol>
                        </p>
                        <p>The number of the class in the final annotations will be the rank of the class in the side panel,
                           i.e. the class at the top will be class number 1, the second from the top is class number 2, etc...</p>
                        <p>In order to keep the class numbers consistent for 2 images, it is important that the list of classes
                           is identical as shown on the side panel.</p>
                    </Tab>
                    <Tab eventKey="annotations" title="Annotations">
                        <p>To make annotations, first select a class, then:
                            <ul>
                                <li>select the paint tool ( <FontAwesomeIcon icon="fa-paintbrush" size="xl" /> ), and paint the area to annotate<br></br>
                                    you can correct the painting with the eraser ( <FontAwesomeIcon icon="fa-eraser" size="xl" /> )</li>
                                or
                                <li>select the olygon tool ( <FontAwesomeIcon icon="fa-draw-polygon" size="xl" /> ), and create a polygon by selecting points on the image<br></br>
                                    you can update a polygon by using the select tool ( <FontAwesomeIcon icon="fa-arrow-pointer" size="xl" /> ): you can change class, move points, add and delete points, or delete the polygon</li>
                            </ul>
                        </p>
                        <p>To export annotations:
                            <ul>
                                <li>select 'export annotations' in the File menu, and select the file to save the annotations in</li>
                                <li>the application may become unresponsive while the annotations are being converted</li>
                                <li>the annotations are saved as a PNG file<br></br>
                                    pixels have RGB components matching the class number<br></br>
                                    a pixel of class 4 has if of color (rgba)=(4,4,4,255)<br></br>
                                    the background is of color rgba=(0,0,0,0)</li>
                            </ul>
                        </p>
                    </Tab>
                </Tabs>
                
            </Modal.Body>
            <Modal.Footer>
                <Button variant="primary" onClick={onClose}>
                    Ok
                </Button>
            </Modal.Footer>
        </Modal>
    );
}

export default Help;