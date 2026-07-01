import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { Link } from "expo-router";
import { fetchCrawledPosts, resolveMediaUrl, CrawledPost } from "@/src/utils/crawledPosts";

/**
 * # Component hiển thị màn hình Feed danh sách các bài đăng cào được từ các nền tảng xã hội
 */
export default function FeedScreen() {
  const [posts, setPosts] = useState<CrawledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  async function loadPosts(pageNum: number, isRefresh: boolean) {
    try {
      const data = await fetchCrawledPosts({
        platform: platformFilter,
        page: pageNum,
        size: 10,
      });

      if (isRefresh) {
        setPosts(data);
      } else {
        setPosts((prev) => [...prev, ...data]);
      }

      setHasMore(data.length === 10);
    } catch (err) {
      console.error("Lỗi tải danh sách feed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    setPage(0);
    loadPosts(0, true);
  }, [platformFilter]);

  async function handleRefresh() {
    setRefreshing(true);
    setPage(0);
    await loadPosts(0, true);
  }

  async function handleLoadMore() {
    if (!hasMore || loading || refreshing) {
      return;
    }
    const nextPage = page + 1;
    setPage(nextPage);
    await loadPosts(nextPage, false);
  }

  const platforms = [
    { label: "Tất cả", value: undefined },
    { label: "Douyin", value: "douyin" },
    { label: "TikTok", value: "tiktok" },
    { label: "XHS", value: "xhs" },
  ];

  function renderPostItem({ item }: { item: CrawledPost }) {
    const author = item.crawled_authors;
    const coverUri = resolveMediaUrl(item.cover_url || item.media_urls?.[0]);

    return (
      <Link href={{ pathname: "/post/[id]", params: { id: item.id } }} asChild>
        <TouchableOpacity className="bg-white rounded-xl mb-4 border border-gray-100 overflow-hidden shadow-sm active:opacity-90">
          {coverUri ? (
            <Image
              source={{ uri: coverUri }}
              className="w-full h-48 bg-gray-200"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-48 bg-gray-200 justify-center items-center">
              <Text className="text-gray-400">Không có hình ảnh/video</Text>
            </View>
          )}

          <View className="p-4">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center flex-1">
                {author?.avatar_url ? (
                  <Image
                    source={{ uri: resolveMediaUrl(author.avatar_url) }}
                    className="w-8 h-8 rounded-full bg-gray-200 mr-2"
                  />
                ) : (
                  <View className="w-8 h-8 rounded-full bg-gray-300 justify-center items-center mr-2">
                    <Text className="text-xs text-white">👤</Text>
                  </View>
                )}
                <Text className="font-semibold text-gray-800 text-sm flex-1" numberOfLines={1}>
                  {author?.nickname || "Người dùng"}
                </Text>
              </View>

              <View className="bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
                <Text className="text-xs font-bold text-red-600 uppercase">
                  {item.platform}
                </Text>
              </View>
            </View>

            <Text className="text-gray-700 text-sm mb-3 font-medium" numberOfLines={2}>
              {item.caption || "Không có tiêu đề"}
            </Text>

            <View className="flex-row items-center justify-between pt-2 border-t border-gray-50">
              <View className="flex-row space-x-4">
                <Text className="text-gray-500 text-xs">
                  ❤️ {item.stats?.digg_count ?? 0}
                </Text>
                <Text className="text-gray-500 text-xs">
                  💬 {item.stats?.comment_count ?? 0}
                </Text>
                <Text className="text-gray-500 text-xs">
                  👁️ {item.stats?.play_count ?? 0}
                </Text>
              </View>

              <Text className="text-gray-400 text-xxs">
                {item.published_at ? new Date(item.published_at).toLocaleDateString() : ""}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Link>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row px-4 py-3 space-x-2 border-b border-gray-100 bg-white">
        {platforms.map((p) => {
          const isSelected = platformFilter === p.value;
          return (
            <TouchableOpacity
              key={p.label}
              onPress={() => setPlatformFilter(p.value)}
              className={`px-4 py-1.5 rounded-full ${
                isSelected ? "bg-red-500" : "bg-gray-100"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  isSelected ? "text-white" : "text-gray-600"
                }`}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && page === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPostItem}
          contentContainerStyle={{ padding: 16 }}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            hasMore ? (
              <ActivityIndicator size="small" color="#ef4444" className="py-4" />
            ) : (
              <View className="py-6 justify-center items-center">
                <Text className="text-gray-400 text-xs font-medium">
                  Đã tải hết danh sách dữ liệu
                </Text>
              </View>
            )
          }
          ListEmptyComponent={
            <View className="py-20 justify-center items-center">
              <Text className="text-gray-400 text-base">Chưa có bài đăng nào được cào</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
