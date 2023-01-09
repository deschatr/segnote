import React, {useState} from 'react';

import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import NavDropdown from 'react-bootstrap/NavDropdown';

import About from '../components/About';
import Help from '../components/Help';

/**
 * React container, renders the menu bar of the paplication
 * all actions are callbacks to the main App.js script
 * this container manages the display of the About and Help components
 */
const MenuBar = ({openImage, importClasses, exportClasses, exportAnnotations, segmentImage, segmentBox}) => {

    const [showHelp,setShowHelp] = useState(false);
    const [showAbout,setShowAbout] = useState(false);


    return (
        <>
        <Navbar className="m-0 p-1">
        SegNote
                <Nav className="mx-3">

                    <Nav.Item>
                    <NavDropdown title="File">
                        <NavDropdown.Item onClick={openImage}>Open Image...</NavDropdown.Item>
                        <NavDropdown.Item onClick={importClasses}>Import Classes...</NavDropdown.Item>
                        <NavDropdown.Item onClick={exportClasses}>Export Classes...</NavDropdown.Item>
                        <NavDropdown.Item onClick={exportAnnotations}>Export Annotations...</NavDropdown.Item>
                    </NavDropdown>
                    </Nav.Item>

                    <Nav.Item>
                    <NavDropdown title="Tools">
                        <NavDropdown.Item onClick={segmentImage}>Segment image</NavDropdown.Item>
                        <NavDropdown.Item onClick={segmentBox}>Segment selection</NavDropdown.Item>
                    </NavDropdown>
                    </Nav.Item>

                    <Nav.Item>
                    <NavDropdown title="Help">
                        <NavDropdown.Item onClick={ ()=>setShowHelp(true) }>Help...</NavDropdown.Item>
                        <NavDropdown.Item onClick={ ()=>setShowAbout(true) }>About...</NavDropdown.Item>
                    </NavDropdown>
                    </Nav.Item>

                </Nav>
        </Navbar>

        <About show={showAbout} onClose={ ()=>setShowAbout(false) }/>
        <Help show={showHelp} onClose={ ()=>setShowHelp(false) }/>
        </>
    )
}

export default MenuBar;