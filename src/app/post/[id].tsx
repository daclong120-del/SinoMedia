import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  Share,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { fetchCrawledPostById, resolveMediaUrl, CrawledPost } from "@/src/utils/crawledPosts";

const { width } = Dimensions.get("window");

/**
 * # Component màn hình chi tiết bài viết/video cào được hiển thị đầy đủ caption và media
 */
export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<CrawledPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function loadPost() {
      try {
        const data = await fetchCrawledPostById(id as string);
        setPost(data);
      } catch (err) {
        console.error("Lỗi lấy thông tin chi tiết bài viết:", err);
        setError("Không thể tìm thấy bài viết này");
      } finally {
        setLoading(false);
      }
    }
    loadPost();
  }, [id]);

  async function handleOpenOriginal() {
    if (!post) return;
    const url = post.platform === "douyin"
      ? `https://www.douyin.com/video/${post.platform_id}`
      : `https://www.tiktok.com/@creator/video/${post.platform_id}`;
    await WebBrowser.openBrowserAsync(url);
  }

  async function handleShare() {
    if (!post) return;
    try {
      await Share.share({
        message: `${post.caption || "Xem bài viết cào được"}\nPlatform: ${post.platform}`,
      });
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#ef4444" />
      </View>
    );
  }

  if (error || !post) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 px-6">
        <Text className="text-gray-500 text-lg mb-4">{error || "Không tìm thấy bài đăng"}</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-red-500 px-6 py-2 rounded-lg"
        >
          <Text className="text-white font-semibold">Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const author = post.crawled_authors;
  const isVideo = post.platform === "douyin" || post.platform === "tiktok";

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Text className="text-red-500 font-semibold text-base">Quay lại</Text>
        </TouchableOpacity>
        <Text className="font-bold text-gray-800 text-lg">Chi tiết</Text>
        <TouchableOpacity onPress={handleShare} className="p-1">
          <Text className="text-red-500 font-semibold text-base">Chia sẻ</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1">
        {isVideo && post.media_urls.length > 0 ? (
          <View className="w-full relative">
            <Image
              source={{ uri: resolveMediaUrl(post.cover_url || post.media_urls[0]) }}
              style={{ width, height: width * 1.2 }}
              className="bg-gray-900"
              resizeMode="contain"
            />
            <TouchableOpacity
              onPress={handleOpenOriginal}
              className="absolute inset-0 justify-center items-center bg-black/30"
            >
              <View className="bg-red-500 w-16 h-16 rounded-full justify-center items-center shadow-lg">
                <Text className="text-white text-2xl font-bold ml-1">▶</Text>
              </View>
              <Text className="text-white text-xs mt-3 bg-black/60 px-3 py-1 rounded-full font-semibold">
                Xem video gốc trên trình duyệt
              </Text>
            </TouchableOpacity>
          </View>
        ) : post.media_urls.length > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={{ width, height: width }}
          >
            {post.media_urls.map((url, i) => (
              <Image
                key={i}
                source={{ uri: resolveMediaUrl(url) }}
                style={{ width, height: width }}
                className="bg-gray-200"
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        ) : null}

        <View className="bg-white p-5 border-b border-gray-100">
          <View className="flex-row items-center mb-4">
            {author?.avatar_url ? (
              <Image
                source={{ uri: resolveMediaUrl(author.avatar_url) }}
                className="w-12 h-12 rounded-full bg-gray-200 mr-3"
              />
            ) : (
              <View className="w-12 h-12 rounded-full bg-gray-300 justify-center items-center mr-3">
                <Text className="text-white text-lg">👤</Text>
              </View>
            )}
            <View className="flex-1">
              <Text className="font-bold text-gray-900 text-base">{author?.nickname || "Người dùng"}</Text>
              <Text className="text-gray-400 text-xs">ID: {author?.platform_uid}</Text>
            </View>
            <View className="bg-red-50 px-3 py-1 rounded-full border border-red-100">
              <Text className="text-xs font-bold text-red-600 uppercase">{post.platform}</Text>
            </View>
          </View>

          <Text className="text-gray-800 text-base leading-6 mb-4">{post.caption}</Text>

          <View className="flex-row space-x-6 py-3 border-t border-b border-gray-50">
            <View>
              <Text className="text-gray-400 text-xs mb-0.5">Yêu thích</Text>
              <Text className="font-bold text-gray-800 text-lg">{post.stats?.digg_count ?? 0}</Text>
            </View>
            <View>
              <Text className="text-gray-400 text-xs mb-0.5">Bình luận</Text>
              <Text className="font-bold text-gray-800 text-lg">{post.stats?.comment_count ?? 0}</Text>
            </View>
            <View>
              <Text className="text-gray-400 text-xs mb-0.5 font-normal">Lượt xem</Text>
              <Text className="font-bold text-gray-800 text-lg">{post.stats?.play_count ?? 0}</Text>
            </View>
          </View>

          <View className="mt-4 flex-row justify-between items-center">
            <Text className="text-gray-400 text-xs">
              Đăng lúc: {post.published_at ? new Date(post.published_at).toLocaleString() : ""}
            </Text>
            <TouchableOpacity
              onPress={handleOpenOriginal}
              className="bg-gray-100 px-4 py-2 rounded-lg"
            >
              <Text className="text-gray-600 text-xs font-semibold">Xem bản gốc</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
