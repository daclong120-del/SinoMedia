"use server";
/**
 * Server Actions — Creative Hub
 * Wrapper cho creative.service.
 */
import {
  searchAds,
  getAdById,
  getAdvertisers,
  getAdvertiserById,
  getTrending,
  getNew,
  getGrowth,
  getSimilar,
} from "@/lib/services/creative.service";

export {
  searchAds,
  getAdById,
  getAdvertisers,
  getAdvertiserById,
  getTrending,
  getNew,
  getGrowth,
  getSimilar,
};
