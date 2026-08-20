import styled from "@emotion/styled";
import React from "react";

export default ({ center, children }) => <Div center={center}>{children}</Div>;

const Div = styled("div")`
  display: flex;
  justify-content: ${({ center }) => (center ? "center" : "")};
`;
