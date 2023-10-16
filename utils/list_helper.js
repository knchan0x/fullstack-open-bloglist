const lodash = require("lodash");

// eslint-disable-next-line no-unused-vars
const dummy = (blogs) => {
  return 1;
};

const totalLikes = (blogs) => {
  return blogs.reduce((sum, e) => sum + e.likes, 0);
};

const favoriteBlog = (blogs) => {
  if (blogs.length >= 1) {
    const blog = blogs.sort((a, b) => b.likes - a.likes)[0];
    return {
      title: blog.title,
      author: blog.author,
      likes: blog.likes,
    };
  } else {
    return {};
  }
};

const mostBlogs = (blogs) => {
  if (blogs.length >= 1) {
    return lodash
      .chain(blogs)
      .groupBy("author")
      .map((value, key) => ({
        author: key,
        blogs: value.length,
      }))
      .maxBy("blogs")
      .value();
  } else {
    return {};
  }
};

const mostLikes = (blogs) => {
  if (blogs.length >= 1) {
    return lodash
      .chain(blogs)
      .groupBy("author")
      .map((value, key) => ({
        author: key,
        likes: lodash.sumBy(value, "likes"),
      }))
      .maxBy("likes")
      .value();
  } else {
    return {};
  }
};

module.exports = {
  dummy,
  totalLikes,
  favoriteBlog,
  mostBlogs,
  mostLikes,
};
