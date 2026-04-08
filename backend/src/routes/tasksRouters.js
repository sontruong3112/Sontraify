import express from 'express';

const router = express.Router();

router.get("/", (request, response) => {
  response.status(200).send("bạn có 100 việc cần làm");
});

router.post("/", (req, res) => {
    res.status(201).json({ message: "Nhiệm vụ đã được tạo thành công" });
});

router.put("/:id", (req, res) => {
    res.status(201).json({ message: "Nhiệm vụ đã được update thành công" });
});

router.delete("/:id", (req, res) => {
    res.status(201).json({ message: "Nhiệm vụ đã được xóa thành công" });
});