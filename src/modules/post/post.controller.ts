import { postService } from "./post.service";
import { authentication } from "../../middleware/authentication.middleware";
import { Router } from "express";
import {
  cloudFileUpload,
  fileValidation,
} from "../../utils/multer/cloud.multer";
import { validation } from "../../middleware/validation.middleware";
import * as validators from "./post.validation";
import { commentRouter } from "../comment";

const router = Router();
router.use("/:postId/comment", commentRouter);



router.get("/", authentication(), postService.postList);

router.post(
  "/",
  authentication(),
  cloudFileUpload({ validation: fileValidation.image }).array("attachments", 2),
  validation(validators.createPost),
  postService.createPost
);

router.patch(
  "/:postId",
  authentication(),
  cloudFileUpload({ validation: fileValidation.image }).array("attachments", 2),
  validation(validators.updatePost),
  postService.updatePost
);

router.patch(
  "/:postId/like",
  authentication(),
  validation(validators.likePost),
  postService.likePost
);

export default router;
