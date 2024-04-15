import React, { useState, useEffect, useContext } from "react";
import { Link, useParams } from "react-router-dom";
import PostAuthor from "../components/PostAuthor";
import thumbnail from "../images/thumbnail1.jpg";
import Loader from "../components/Loader";
import DeletePost from "./DeletePost";
import { UserContext } from "../context/userContext";
import axios from "axios";

const PostDetail = () => {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const { currentUser } = useContext(UserContext);

  useEffect(() => {
    const getPost = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/posts/${id}`
        );
        setPost(response?.data);
      } catch (error) {
        setError(error);
      }
      setIsLoading(false);
    };
    getPost();
  }, []);

  if (isLoading) {
    return <Loader />;
  }
  return (
    <section className="post_detail">
      {error && <p className="error">{error}</p>}
      {post && (
        <div className="container post_detail_container">
          <div className="post_detail_header">
            <PostAuthor authorId={post.creator} createdAt={post.createdAt} />
            {currentUser?.id == post?.creator && (
              <div className="post_detail_buttons">
                <Link
                  to={`/posts/${post?._id}/edit`}
                  className="btn sm primary"
                >
                  Edit
                </Link>
                <DeletePost postId={id} />
              </div>
            )}
          </div>
          <h1>{post.title}</h1>
          <div className="post_detail_thumbnail">
            <img
              src={`${process.env.REACT_APP_ASSETS_URL}/uploads/${post.thumbnail}`}
              alt=""
            />
          </div>
          <p dangerouslySetInnerHTML={{ __html: post.description }}></p>
        </div>
      )}
    </section>
  );
};

export default PostDetail;
