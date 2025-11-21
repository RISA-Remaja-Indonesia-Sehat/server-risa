const { prisma } = require("../config/db");

module.exports = {
  getAllArticle: async (req, res) => {
    try {
      const articles = await prisma.articles.findMany();
      res.status(200).json({
        message: "Success",
        data: articles,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  searchArticles: async (req, res) => {
    try {
      const { query } = req.query; // ambil query dari URL ?query=

      if (!query || query.trim() === "") {
        return res.status(400).json({ message: "Query tidak boleh kosong" });
      }

      const search = query.trim();

      // Pencarian di title, content, dan tags (case-insensitive)
      const articles = await prisma.articles.findMany({
        where: {
          OR: [
            {
              title: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              content: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              tags: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.status(200).json({
        message: "Success",
        data: articles,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  getArticleById: async (req, res) => {
    try {
      const { id } = req.params;
      const article = await prisma.articles.findUnique({
        where: { id: parseInt(id) },
      });

      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }

      res.status(200).json({
        message: "Success",
        data: article,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  createArticle: async (req, res) => {
    try {
      const { title, imageUrl, imageAlt, description, opinion, content } =
        req.body;

      if (!title) {
        return res.status(400).json({ message: "Mohon diisi semua" });
      }

      const newArticle = await prisma.articles.create({
        data: {
          title,
          imageUrl,
          imageAlt,
          description,
          opinion,
          content,
        },
      });

      res.status(201).json({
        message: "Article created successfully",
        data: {
          id: newArticle.id,
          title: newArticle.title,
          content: newArticle.content,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
  updateArticle: async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content } = req.body;

      if (!title || !content) {
        return res.status(400).json({ message: "Mohon diisi semua" });
      }

      const updatedArticle = await prisma.articles.update({
        where: { id: parseInt(id) },
        data: {
          title,
          content,
        },
      });

      res.status(200).json({
        message: "Article updated successfully",
        data: {
          id: updatedArticle.id,
          title: updatedArticle.title,
          content: updatedArticle.content,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  deleteArticle: async (req, res) => {
    try {
      const { id } = req.params;

      await prisma.articles.delete({
        where: { id: parseInt(id) },
      });

      res.status(200).json({ message: "Article deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
};
