const blogsRouter = require("express").Router();
const Blog = require("../models/blog");

blogsRouter.get("/", async (request, response) => {
  const blogs = await Blog.find({}).populate("user", { username: 1, name: 1 });
  response.json(blogs);
});

blogsRouter.post("/", async (request, response) => {
  const body = request.body;
  const user = request.user;

  if (!user) {
    return response.status(401).send({
      error: "token invalid",
    });
  }

  const blog = new Blog({ ...body, user: user.id });
  const saved = await blog.save();
  user.blogs = user.blogs.concat(saved.id);
  await user.save();

  response.status(201).json(blog);
});

blogsRouter.get("/:id", async (request, response) => {
  const blog = await Blog.findById(request.params.id).populate("user", {
    username: 1,
    name: 1,
    id: 1,
  });
  if (blog) {
    response.json(blog);
  } else {
    response.status(404).end();
  }
});

blogsRouter.delete("/:id", async (request, response) => {
  const blog = await Blog.findById(request.params.id);
  if (!request.user || request.user.id.toString() !== blog.user.toString()) {
    return response.status(401).json({ error: "token invalid" });
  }

  await Blog.findByIdAndRemove(blog.id);
  response.status(204).end();
});

blogsRouter.put("/:id", async (request, response, next) => {
  const { title, author, url, likes } = request.body;

  const blog = await Blog.findById(request.params.id);

  if (!request.user || request.user.id.toString() !== blog.user.toString()) {
    return response.status(401).json({ error: "token invalid" });
  }

  try {
    const updated = await Blog.findByIdAndUpdate(
      blog.id,
      { title, author, url, likes },
      { returnDocument: "after", runValidators: true, context: "query" }
    ).populate("user", { username: 1, name: 1 });

    response.json(updated);
  } catch {
    (error) => next(error);
  }
});

module.exports = blogsRouter;
