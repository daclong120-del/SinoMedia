"use server";
/**
 * Server Actions — Data (Posts, Authors, Comments)
 * Wrapper cho data.service.
 */
import {
  getPosts,
  getAuthors,
  getComments,
  getTags,
} from "@/lib/services/data.service";

export {
  getPosts,
  getAuthors,
  getComments,
  getTags,
};
