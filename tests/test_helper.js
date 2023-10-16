const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const Blog = require("../models/blog");
const User = require("../models/user");

const initialBlogs = [
  {
    _id: "5a422a851b54a676234d17f7",
    title: "React patterns",
    author: "Michael Chan",
    url: "https://reactpatterns.com/",
    likes: 7,
    __v: 0,
  },
  {
    _id: "5a422aa71b54a676234d17f8",
    title: "Go To Statement Considered Harmful",
    author: "Edsger W. Dijkstra",
    url: "http://www.u.arizona.edu/~rubinson/copyright_violations/Go_To_Considered_HarBlog.html",
    likes: 5,
    __v: 0,
  },
];

const nonExistingId = async () => {
  const blog = new Blog({
    title: "will remove this soon",
    author: "noname",
    url: "https://delete.it/",
    likes: 0,
  });
  await blog.save();
  await blog.deleteOne();

  return blog._id.toString();
};

const blogsInDb = async () => {
  const blogs = await Blog.find({}).populate("user", { username: 1, name: 1 });
  return blogs.map((blog) => blog.toJSON());
};

const setupBlogDb = async (users) => {
  const blogObjects = initialBlogs.map(
    (blog) =>
      new Blog({
        ...blog,
        // randomly assign one
        user: users[Math.floor(Math.random() * users.length)].id,
      })
  );

  const promiseArray = blogObjects.map((blog) => blog.save());
  await Promise.all(promiseArray);
};

const usersInDb = async () => {
  const users = await User.find({}).populate("blogs");
  return users.map((u) => u.toJSON());
};

const setupUserDb = async () => {
  const rootPasswordHash = await bcrypt.hash("sekret", 10);
  const root = new User({ username: "root", passwordHash: rootPasswordHash });

  await root.save();

  const userPasswordHash = await bcrypt.hash("aaa", 10);
  const user = new User({
    username: "aaa",
    name: "AAA",
    passwordHash: userPasswordHash,
  });

  await user.save();
};

const updateBlogsForUser = async (user, blogs) => {
  await User.findByIdAndUpdate(
    user.id,
    { blogs },
    { returnDocument: "after", runValidators: true, context: "query" }
  );
};

const findUser = async (user) => {
  const users = await usersInDb();
  return users.find((u) => u.id.toString() === user.id);
};

const getToken = (user) => {
  const userForToken = {
    username: user.username,
    id: user.id,
  };

  const token = jwt.sign(userForToken, process.env.SECRET, {
    expiresIn: 60 * 60, // token expires in 60*60 seconds, that is, in one hour
  });

  return token;
};

const getJWTBearer = (user) => {
  return "Bearer " + getToken(user);
};

const initializeDb = async () => {
  await Blog.deleteMany({});
  await User.deleteMany({});

  await setupUserDb();
  const users = await usersInDb();
  await setupBlogDb(users);

  // update blogs for each users
  const blogs = await blogsInDb();
  const promiseArray = users.map((user) => {
    const blogIDs = blogs
      .filter((blog) => blog.user.id === user.id)
      .map((blog) => blog.id);
    updateBlogsForUser(user, blogIDs);
  });
  await Promise.all(promiseArray);
};

module.exports = {
  initialBlogs,
  nonExistingId,
  blogsInDb,
  usersInDb,
  findUser,
  getToken,
  getJWTBearer,
  initializeDb,
};
