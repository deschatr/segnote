import React from 'react';
import Container from 'react-bootstrap/Container';

/**
 * React component to display a title in toolbar or side panel
 * text: string
 */
const Title = ({text}) => {
    return (
        <Container fluid className="m-0 p-2" style={{ backgroundColor: "#e9e9e9"}}>
            {text}
        </Container>
    )
}

export default Title;