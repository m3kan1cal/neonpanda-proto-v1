import React from "react";
import { useParams, Navigate } from "react-router-dom";
import BlogPost from "./BlogPost";
import BlogPost1Foundation from "./BlogPost1Foundation";
import BlogPost2CoachCreator from "./BlogPost2CoachCreator";
import BlogPost3WorkoutLogger from "./BlogPost3WorkoutLogger";
import BlogPost4ProgramDesigner from "./BlogPost4ProgramDesigner";
import BlogPost5Orchestration from "./BlogPost5Orchestration";

// Map slugs to their corresponding blog post components
const blogPostComponents = {
  "the-foundation": BlogPost1Foundation,
  "your-coach-your-way": BlogPost2CoachCreator,
  "every-rep-counts": BlogPost3WorkoutLogger,
  "training-programs-that-think": BlogPost4ProgramDesigner,
  "the-symphony": BlogPost5Orchestration,
};

// Published blog posts
const publishedSlugs = ["the-foundation", "your-coach-your-way"];

function BlogPostRouter() {
  const { slug } = useParams();

  // Redirect unpublished posts back to blog index
  if (slug && !publishedSlugs.includes(slug) && blogPostComponents[slug]) {
    return <Navigate to="/blog" replace />;
  }

  const PostComponent = blogPostComponents[slug];

  // If slug doesn't match any post, BlogPost will handle the 404
  return <BlogPost>{PostComponent && <PostComponent />}</BlogPost>;
}

export default BlogPostRouter;
