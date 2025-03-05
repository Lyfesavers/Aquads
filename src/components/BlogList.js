import React, { useState } from 'react';
import { FaShare, FaEdit, FaTrash } from 'react-icons/fa';
import DOMPurify from 'dompurify';

const BlogList = ({ blogs, currentUser, onEditBlog, onDeleteBlog }) => {
  const [expandedBlogId, setExpandedBlogId] = useState(null);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleShare = (blog) => {
    const shareUrl = `${window.location.origin}/how-to`;
    const affiliateCode = currentUser?.username ? `${currentUser.username}-@` : '';
    const fullUrl = `${affiliateCode}${shareUrl}?blogId=${blog._id}`;
    
    navigator.clipboard.writeText(fullUrl).then(() => {
      alert('Share link copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const truncateContent = (content) => {
    const strippedContent = content.replace(/<[^>]*>/g, '');
    return strippedContent.length > 300 
      ? strippedContent.substring(0, 300) + '...'
      : strippedContent;
  };

  if (!blogs?.length) {
    return (
      <div className="text-center py-8 text-gray-400">
        No blog posts yet.
      </div>
    );
  }

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {blogs.map((blog) => (
        <div
          key={blog._id}
          id={`blog-${blog._id}`}
          className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg overflow-hidden hover:bg-gray-800/70 transition-all duration-300"
        >
          {/* Banner Image */}
          <div className="aspect-video">
            <img
              src={blog.bannerImage}
              alt={blog.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="flex items-start justify-between mb-4">
              {/* Author Info */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <img
                    src={blog.authorImage || `https://ui-avatars.com/api/?name=${blog.authorUsername}&background=random`}
                    alt={blog.authorUsername}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-medium text-white">{blog.authorUsername}</div>
                  <div className="text-sm text-gray-400">{formatDate(blog.createdAt)}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleShare(blog)}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                  title="Share"
                >
                  <FaShare size={18} />
                </button>
                {currentUser && (currentUser.userId === blog.author || currentUser.isAdmin) && (
                  <>
                    <button
                      onClick={() => onEditBlog(blog)}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                      title="Edit"
                    >
                      <FaEdit size={18} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this blog post?')) {
                          onDeleteBlog(blog._id);
                        }
                      }}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      title="Delete"
                    >
                      <FaTrash size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-white mb-2">{blog.title}</h2>

            {/* Content Preview */}
            <div 
              className={`prose prose-invert max-w-none ${
                expandedBlogId === blog._id ? '' : 'line-clamp-3'
              }`}
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(
                  expandedBlogId === blog._id ? blog.content : truncateContent(blog.content)
                )
              }}
            />

            {/* Read More Button */}
            <button
              onClick={() => setExpandedBlogId(expandedBlogId === blog._id ? null : blog._id)}
              className="mt-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
              {expandedBlogId === blog._id ? 'Show Less' : 'Read More'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BlogList; 