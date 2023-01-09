import React, { useEffect, useState} from 'react';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';

import { useSelector } from 'react-redux';
import { selectClasses } from '../app/appStateSlice';

/**
 * renders a modal containing a form to create or update a class
 * title (string) title for the modal
 * id (string) class id
 * isOpen (boolean) show
 * onHide callback on hide
 * onSubmit callback on submit
 * onCancel callback on cancel
 */

const ClassForm = ( { title, id, isOpen, onHide, onSubmit, onCancel } ) => {

    const [name, setName] = useState("");
    const [message,setMessage] = useState(undefined);
    const classes = useSelector(selectClasses);

    function handleOnChange(e)  {
        setName(e.target.value);
    }

    function handleOnSubmit() {
        if (!name || name === null || name === "") {
            setMessage("The name can not be empty.");
        } else if (!name.match(/^[A-Z a-z\-]+$/)) {
            setMessage("The name can only contain letters, space or hyphen.");
        } else {
            const klass = classes.find( clss => clss.name === name );
            if (klass && klass.id !== id) {
                setMessage(`The class name ${name} is already in use.`);
            } else {
                const className = name;
                setName("");
                setMessage(undefined);
                onSubmit(className);
            }
        }
    }

    function handleOnCancel() {
        setMessage(undefined);
        setName("");
        onCancel();
    }

    useEffect( ()=> {
        if (id) {
            const klass = classes.find( clss => clss.id === id );
            if (klass) {
                setMessage(undefined);
                setName(klass.name);
            } else {
                throw new Error("Class name not found");
            }
        } else {
            setMessage(undefined);
            setName("");
        }
    },[id])

    return (
        <Modal size="lg" backdrop="static" show={ isOpen } onHide={ onHide }>
            
                <Modal.Header>
                    <Modal.Title>{ title }</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Class name: <Form.Control type="text" value={ name } onChange={ handleOnChange } />
                    {message && <Alert variant="danger">{message}</Alert>}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" type="submit" onClick={ handleOnSubmit }>Submit</Button>
                    <Button variant="primary" type="cancel" onClick={ handleOnCancel }>Cancel</Button>
                </Modal.Footer>
            
        </Modal>
    )
}

export default ClassForm;