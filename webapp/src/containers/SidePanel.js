import React,{ useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectClasses, createClass, updateClass , deleteClass, selectActiveClass, setActiveClass } from '../app/appStateSlice';

import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Card from 'react-bootstrap/Card';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import Title from '../components/Title';
import ClassCard from '../components/ClassCard';
import ClassForm from './ClassForm';

/**
 * React container to render the side panel of the application
 * it displays a title and a list of class cards, as well as handling class forms to create, update or delete classes
 */
const SidePanel = () => {

    const dispatch = useDispatch();
    const classes = useSelector(selectClasses);
    const activeClass = useSelector(selectActiveClass);

    const [ showCreateClassForm, setShowCreateClassForm ] = useState(false);
    const [ showUpdateClassForm, setShowUpdateClassForm ] = useState(false);
    const [ showDeleteClassForm, setShowDeleteClassForm ] = useState(false);

    const deletedClass = useRef(undefined);
    const updatedClass = useRef(undefined);

    function getClass(id) {
        return classes.find( klass => klass.id === id )
    }

    function handleOnClick(event, id) {
        if (activeClass.id === id) {
            updatedClass.current = getClass(id);
            setShowUpdateClassForm(true);
        } else {
            dispatch(setActiveClass({id: id}));
        }
        event.stopPropagation()
    }

    function handleOnClose(event, id) {
        deletedClass.current = getClass(id);
        setShowDeleteClassForm(true);
        event.stopPropagation();
    }

    /**
     * 
     */
    function handleOnAddClassClick() {
        setShowCreateClassForm(true);
    }
    
    function handleOnCreateSubmit(name) {
        console.log("creating class");
        dispatch(createClass({name: name}));
        setShowCreateClassForm(false);
    }

    function handleOnCreateCancel() {
        setShowCreateClassForm(false);
    }

    function hideCreateClassForm() {
        setShowCreateClassForm(false);
    }

    function handleOnUpdateSubmit(name) {
        dispatch(updateClass({id : updatedClass.current.id, name: name}))
        setShowUpdateClassForm(false);
        updatedClass.current = undefined;
    }

    function handleOnUpdateCancel(event) {
        setShowUpdateClassForm(false);
    }

    function handleOnDeleteSubmit() {
        dispatch(deleteClass({id: deletedClass.current.id}));
        deletedClass.current = undefined;
        setShowDeleteClassForm(false);
    }

    function handleOnDeleteCancel() {
        deletedClass.current = undefined;
        setShowDeleteClassForm(false);
    }
    
    function hideUpdateClassForm() {
        setShowUpdateClassForm(false);
        updatedClass.current = undefined;
    }

    function hideDeleteClassForm() {
        setShowDeleteClassForm(false);
        deletedClass.current = undefined;
    }
    
    // returns the list of classes with active class highlighted
    // this is a form, class name of active class can be edited, another class can be made active
    // a class can also be deleted
    // a class can be added
    return (
        <>
            <Title text="Classes" />
            {
                classes.map( (klass,i) => {
                    return (
                        <ClassCard
                            key={klass.id}
                            id={klass.id}
                            name={klass.name}
                            color={klass.color}
                            selected={activeClass.id != null && klass.id === activeClass.id}
                            onClick={(event) => handleOnClick(event, klass.id)}
                            onClose={(event) => handleOnClose(event, klass.id)}
                        />
                    )
                })
            }
            <Card className="m-1 p-1">
                <Card.Body className="m-0 p-1" onClick={handleOnAddClassClick} style={{ userSelect: "none", cursor: "pointer" }}>
                    <FontAwesomeIcon icon="plus" size="xl" />
                </Card.Body>
            </Card>

            <ClassForm title="Create class"
                isOpen={showCreateClassForm}
                onHide={hideCreateClassForm}
                onSubmit={handleOnCreateSubmit}
                onCancel={handleOnCreateCancel}
            />

            
            <ClassForm title="Update class"
                id={updatedClass.current && updatedClass.current.id}
                isOpen={showUpdateClassForm}
                onHide={hideUpdateClassForm}
                onSubmit={handleOnUpdateSubmit}
                onCancel={handleOnUpdateCancel}
            />

            <Modal size ="lg" backdrop="static" show={showDeleteClassForm} onHide={ hideDeleteClassForm }>
                <Modal.Header>
                    <Modal.Title>Delete Class</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Are you sure you want to delete the class: {deletedClass.current && deletedClass.current.name}<br></br>
                    If annotations have been saved with classes that are lower in the list of classes, these annotations will not be valid anymore...
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" type="submit" onClick={ handleOnDeleteSubmit }>
                        Delete
                    </Button>
                    <Button variant="primary" type="cancel" onClick={ handleOnDeleteCancel }>
                        Cancel
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    )
}

export default SidePanel