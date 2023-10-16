const mongoose = require("mongoose");
const supertest = require("supertest");
const app = require("../app");
const helper = require("./test_helper");
const api = supertest(app);

beforeEach(async () => {
  await helper.initializeDb();
});

describe("when there is initially some blogs saved", () => {
  test("blogs are returned as json", async () => {
    await api
      .get("/api/blogs")
      .expect(200)
      .expect("Content-Type", /application\/json/);
  });

  test("all blogs are returned", async () => {
    const response = await api.get("/api/blogs");

    expect(response.body).toHaveLength(helper.initialBlogs.length);
  });

  test("a specific blog is within the returned blogs", async () => {
    const response = await api.get("/api/blogs");

    const titles = response.body.map((r) => r.title);
    expect(titles).toContain("React patterns");
  });

  test("blog contains id property", async () => {
    const response = await api.get("/api/blogs");

    expect(response.body[0].id).toBeDefined();
    expect(response.body[0]._id).not.toBeDefined();
  });
});

describe("viewing a specific note", () => {
  test("succeeds with a valid id", async () => {
    const blogsAtStart = await helper.blogsInDb();

    const blogToView = blogsAtStart[0];

    const resultBlog = await api
      .get(`/api/blogs/${blogToView.id}`)
      .expect(200)
      .expect("Content-Type", /application\/json/);

    expect(resultBlog.body).toEqual(blogToView);
  });

  test("fails with statuscode 404 if blog does not exist", async () => {
    const validNonexistingId = await helper.nonExistingId();

    await api.get(`/api/blogs/${validNonexistingId}`).expect(404);
  });

  test("fails with statuscode 400 if id is invalid", async () => {
    const invalidId = "testing123";

    await api.get(`/api/blogs/${invalidId}`).expect(400);
  });
});

describe("addition of a new note", () => {
  test("succeeds with valid data", async () => {
    const users = await helper.usersInDb();
    const token = helper.getJWTBearer(users[0]);

    const newBlog = {
      title: "async/await simplifies making async calls",
      author: "Michael Chan",
      url: "https://google.com/",
      likes: 0,
    };

    await api
      .post("/api/blogs")
      .set("authorization", token)
      .send(newBlog)
      .expect(201)
      .expect("Content-Type", /application\/json/);

    const blogsAtEnd = await helper.blogsInDb();
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length + 1);
    expect(blogsAtEnd[helper.initialBlogs.length].user.id).toEqual(users[0].id);

    const titles = blogsAtEnd.map((n) => n.title);
    expect(titles).toContain("async/await simplifies making async calls");
  });

  test("succeeds with missing likes", async () => {
    const users = await helper.usersInDb();
    const token = helper.getJWTBearer(users[0]);

    const newBlog = {
      title: "Testing",
      author: "Michael Chan",
      url: "https://google.com/",
    };

    await api
      .post("/api/blogs")
      .set("authorization", token)
      .send(newBlog)
      .expect(201);

    const blogsAtEnd = await helper.blogsInDb();

    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length + 1);
    expect(blogsAtEnd[helper.initialBlogs.length].likes).toEqual(0);
  });

  test("fails with status code 400 if missing title", async () => {
    const users = await helper.usersInDb();
    const token = helper.getJWTBearer(users[0]);

    const newBlog = {
      author: "Michael Chan",
      url: "https://google.com/",
      likes: 0,
    };

    await api
      .post("/api/blogs")
      .set("authorization", token)
      .send(newBlog)
      .expect(400);

    const blogsAtEnd = await helper.blogsInDb();

    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length);
  });

  test("fails with status code 400 if missing url", async () => {
    const users = await helper.usersInDb();
    const token = helper.getJWTBearer(users[0]);

    const newBlog = {
      title: "Testing",
      author: "Michael Chan",
      likes: 0,
    };

    await api
      .post("/api/blogs")
      .set("authorization", token)
      .send(newBlog)
      .expect(400);

    const blogsAtEnd = await helper.blogsInDb();

    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length);
  });

  test("fails with status code 401 if missing token", async () => {
    const newBlog = {
      title: "Testing",
      author: "Michael Chan",
      url: "https://google.com/",
    };

    const response = await api.post("/api/blogs").send(newBlog).expect(401);

    expect(response.body).toEqual({
      error: "token invalid",
    });
  });

  test("fails with status code 401 if token invalid", async () => {
    const users = await helper.usersInDb();
    const token = helper.getJWTBearer(users[0]);

    const newBlog = {
      title: "Testing",
      author: "Michael Chan",
      url: "https://google.com/",
    };

    const response = await api
      .post("/api/blogs")
      .set("authorization", `${token}000`)
      .send(newBlog)
      .expect(401);

    expect(response.body).toEqual({
      error: "token invalid",
    });
  });
});

describe("deletion of a blog", () => {
  test("succeeds with status code 204 if id is valid", async () => {
    const blogsAtStart = await helper.blogsInDb();
    const blogToDelete = blogsAtStart[0];

    const user = await helper.findUser(blogToDelete.user);
    const token = helper.getJWTBearer(user);

    await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .set("authorization", token)
      .expect(204);

    const blogsAtEnd = await helper.blogsInDb();

    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length - 1);

    const titles = blogsAtEnd.map((r) => r.title);

    expect(titles).not.toContain(blogToDelete.title);
  });

  test("fails with status code 401 if invalid token", async () => {
    const blogsAtStart = await helper.blogsInDb();
    const blogToDelete = blogsAtStart[0];

    const user = await helper.findUser(blogToDelete.user);
    const token = helper.getJWTBearer(user);

    const response = await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .set("authorization", `${token}000`)
      .expect(401);

    expect(response.body).toEqual({
      error: "token invalid",
    });
  });

  test("fails with status code 401 if missing token", async () => {
    const blogsAtStart = await helper.blogsInDb();
    const blogToDelete = blogsAtStart[0];

    const response = await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .expect(401);

    expect(response.body).toEqual({
      error: "token invalid",
    });
  });

  test("fails with status code 401 if invalid token", async () => {
    const blogsAtStart = await helper.blogsInDb();
    const blogToDelete = blogsAtStart[0];

    const users = await helper.usersInDb();
    const otherUsers = users.filter(
      (user) => user.id.toString() !== blogToDelete.user.id.toString()
    );
    expect(otherUsers.length >= 1).toEqual(true);
    const token = helper.getJWTBearer(otherUsers[0]);

    const response = await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .set("authorization", `${token}`)
      .expect(401);

    expect(response.body).toEqual({
      error: "token invalid",
    });
  });
});

describe("Update of a blog", () => {
  test("succeeds with status code 200 if data is valid", async () => {
    const blogsAtStart = await helper.blogsInDb();
    const updatedBlog = { ...blogsAtStart[0], likes: 999 };

    const user = await helper.findUser(updatedBlog.user);
    const token = helper.getJWTBearer(user);

    const response = await api
      .put(`/api/blogs/${updatedBlog.id}`)
      .set("authorization", token)
      .send(updatedBlog)
      .expect(200);

    expect(response.body).toEqual(updatedBlog);

    const blogsAtEnd = await helper.blogsInDb();

    expect(blogsAtEnd[0]).toEqual(updatedBlog);
  });

  test("fails with status code 401 if missing token", async () => {
    const blogsAtStart = await helper.blogsInDb();
    const updatedBlog = { ...blogsAtStart[0], likes: 999 };

    const user = await helper.findUser(updatedBlog.user);
    const token = helper.getJWTBearer(user);

    const response = await api
      .put(`/api/blogs/${updatedBlog.id}`)
      .set("authorization", `${token}000`)
      .send(updatedBlog)
      .expect(401);

    expect(response.body).toEqual({
      error: "token invalid",
    });
  });

  test("fails with status code 401 if token invalid", async () => {
    const blogsAtStart = await helper.blogsInDb();
    const updatedBlog = { ...blogsAtStart[0], likes: 999 };

    const users = await helper.usersInDb();
    const otherUsers = users.filter(
      (user) => user.id.toString() !== updatedBlog.user.id.toString()
    );
    expect(otherUsers.length >= 1).toEqual(true);
    const token = helper.getJWTBearer(otherUsers[0]);

    const response = await api
      .put(`/api/blogs/${updatedBlog.id}`)
      .set("authorization", `${token}`)
      .send(updatedBlog)
      .expect(401);

    expect(response.body).toEqual({
      error: "token invalid",
    });
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});
