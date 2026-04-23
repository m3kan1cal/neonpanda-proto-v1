import React from "react";
import { useParams, Navigate } from "react-router-dom";
import UseCaseGrant from "./papers/UseCaseGrant";
import UseCaseDavid from "./papers/UseCaseDavid";
import UseCaseJames from "./papers/UseCaseJames";
import UseCasePaige from "./papers/UseCasePaige";

// Slug -> component map. Add a new entry here when a new paper lands in
// src/data/whitePapers.js and src/components/white-papers/papers/.
const whitePaperComponents = {
  "use-case-grant-first-meet-prep": UseCaseGrant,
  "use-case-james-functional-chaos": UseCaseJames,
  "use-case-paige-respiratory-therapist-iterates": UseCasePaige,
  "use-case-david-returning-athlete": UseCaseDavid,
};

function WhitePaperRouter() {
  const { slug } = useParams();
  const PaperComponent = slug ? whitePaperComponents[slug] : undefined;

  if (!PaperComponent) {
    return <Navigate to="/white-papers" replace />;
  }

  return <PaperComponent />;
}

export default WhitePaperRouter;
