/**
 * @fileoverview Seeding script to populate local Supabase with realistic data for the Dashboard.
 * Run with: npx tsx scratch/seed_db.ts
 */

import "../crawler-pipeline/src/config.js";
import { CONFIG } from "../crawler-pipeline/src/config.js";

// Unsplash images categorized for high quality rendering
const images = {
  xhs: [
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&auto=format&fit=crop&q=80',
  ],
  douyin: [
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1516280440614-37939bbacd6a?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
  ],
  weibo: [
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
  ],
  bilibili: [
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
  ]
};

const avatars = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&h=150&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&q=80',
];

const mockTemplates: Record<string, { nicknames: string[]; tags: string[]; captions: string[] }> = {
  xhs: {
    nicknames: ['Linh OOTD 🎀', 'Vân Anh Beauty ✨', 'KOL Trang Nguyễn 🌸', 'Mai Ly Lifestyle 🌿'],
    tags: ['ootd', 'fashion', 'xhs_trend', 'beauty', 'lifestyle', 'travel'],
    captions: [
      'Gợi ý set đồ dạo phố cuối tuần siêu hack dáng cho các nàng đây! Vừa mát mẻ vừa thanh lịch nhẹ nhàng 👗👠 #fashion #ootd #style',
      'Đập hộp em túi mới tậu từ bộ sưu tập hè cực xinh xắn! Màu sắc ngọt ngào hết nấc luôn á 💕👜 #unboxing #bag #aesthetic',
      'Review quán cafe tone Hàn Quốc siêu yên tĩnh mới phát hiện ở Quận 1. Đồ uống ngon, góc chụp hình siêu lung linh luôn ☕📸 #cafe #hcmc #hotspot',
      'Layout makeup tone Cam Đào ngọt ngào đi hẹn hò cuối tuần nha mọi người. Nhìn trong trẻo nhẹ nhàng lắm luôn 💄🍊 #makeup #tutorial #beauty',
      'Bí quyết chăm da căng bóng chuẩn glass skin chỉ sau 7 ngày. Toàn các sản phẩm lành tính dịu nhẹ thôi nhé 🧴💆‍♀️ #skincare #glassskin #healthy'
    ]
  },
  douyin: {
    nicknames: ['Vũ Dancer ⚡', 'DJ Tommy 🎵', 'Thảo Cover 🎙️', 'Hải Hài Hước 🤣'],
    tags: ['dance', 'music', 'douyin_trend', 'comedy', 'entertainment'],
    captions: [
      'Thử thách nhảy theo trend Douyin hot nhất tuần này! Nhạc bắt tai quá trời luôn 🕺🔥 #dancechallenge #trend #douyin',
      'Acoustic cover bài hát thanh xuân quen thuộc. Cùng nghe và cảm nhận nhé mọi người 🎸🎤 #singing #cover #retro',
      'Khi bạn cố gắng làm quen bạn gái và cái kết dở khóc dở cười 😂🎬 #comedy #funny #troll',
      'Vlog 1 ngày chạy show mệt nghỉ của tôi. Cảm ơn mọi người đã luôn ủng hộ nhé! 🌟🚗 #dailyvlog #worklife #motivation',
      'Mix set nhạc EDM cực phiêu cho tối cuối tuần năng động nào 🎧⚡ #djlife #edm #nightvibes'
    ]
  },
  weibo: {
    nicknames: ['TechNews VN 📱', 'Góc Điện Ảnh 🎬', 'Điểm Tin 24h 📰', 'Trí Tuệ Nhân Tạo 🤖'],
    tags: ['technology', 'news', 'cinema', 'ai', 'discussion'],
    captions: [
      'Đánh giá chi tiết mẫu smartphone gập thế hệ mới nhất vừa ra mắt. Thiết kế siêu mỏng và camera cực kỳ ấn tượng 📱🔥 #techreview #smartphone #nextgen',
      'Tổng hợp các phim điện ảnh bom tấn sắp đổ bộ rạp chiếu tháng này. Bạn mong chờ tác phẩm nào nhất? 🍿🎬 #movies #upcoming #cinema',
      'Trí tuệ nhân tạo (AI) đang thay đổi cuộc sống của chúng ta như thế nào? Cùng thảo luận nhé! 🤖🌐 #ai #technology #future',
      'Điểm tin kinh tế nổi bật trong tuần: Các chỉ số tăng trưởng ấn tượng và triển vọng những tháng cuối năm 📊📰 #economics #news #finance',
      'Mẹo tối ưu hiệu năng máy tính cực kỳ đơn giản cho người thiết kế đồ họa 💻⚡ #tipsandtricks #hardware #designer'
    ]
  },
  bilibili: {
    nicknames: ['Anime Reviewer 🇯🇵', 'Game Master 🎮', 'Kênh Esport 🏆', 'Khám Phá Anime 🍥'],
    tags: ['anime', 'gaming', 'esports', 'review', 'vlog'],
    captions: [
      'Top 10 bộ Anime mùa hè đáng xem nhất mà bạn không nên bỏ lỡ! Cốt truyện siêu cuốn luôn 🇯🇵🍥 #anime #otaku #summerlist',
      'Trực tiếp trận chung kết giải đấu Esport kịch tính nghẹt thở. Cúp vô địch sẽ thuộc về ai? 🏆🎮 #esports #finalmatch #gaming',
      'Review chi tiết game bom tấn vừa phát hành tuần qua. Có thực sự đáng mua không? 🤔🎮 #gamereview #cyberpunk #nextgen',
      'Hướng dẫn build PC gaming cấu hình cực ngon trong tầm giá 20 triệu đồng 🖥️💡 #setup #pcbuild #gamingpc',
      'Góc phân tích nhân vật chính trong bộ manga kinh điển vừa hoàn thành 📖✍️ #manga #analysis #character'
    ]
  }
};

async function seed() {
  console.log('=== BẮT ĐẦU SEED DỮ LIỆU THẬT MẪU VÀO DATABASE LOCAL ===');
  
  const headers = {
    'apikey': CONFIG.supabase.serviceRoleKey,
    'Authorization': `Bearer ${CONFIG.supabase.serviceRoleKey}`,
    'Content-Type': 'application/json',
  };

  try {
    // 1. Clear existing data
    console.log('- Đang dọn sạch dữ liệu cũ trong table crawled_posts và crawled_authors...');
    await fetch(`${CONFIG.supabase.url}/rest/v1/crawled_posts?id=neq.empty`, {
      method: 'DELETE',
      headers,
    });
    await fetch(`${CONFIG.supabase.url}/rest/v1/crawled_authors?id=neq.empty`, {
      method: 'DELETE',
      headers,
    });
    console.log('  -> Dọn dẹp hoàn tất.');

    const platforms = ['xhs', 'douyin', 'weibo', 'bilibili'];
    
    for (const platform of platforms) {
      console.log(`\n- Tiến hành tạo dữ liệu cho nền tảng: ${platform.toUpperCase()}`);
      
      const config = mockTemplates[platform];
      const platformImages = images[platform as keyof typeof images];
      
      // 2. Insert 4 authors
      const authorsToInsert = [];
      for (let i = 0; i < 4; i++) {
        const platformUid = `${platform}_user_${Math.floor(Math.random() * 90000) + 10000}`;
        authorsToInsert.push({
          id: `${platform}_auth_${i + 1}`,
          platform,
          platform_uid: platformUid,
          nickname: config.nicknames[i],
          avatar_url: avatars[Math.floor(Math.random() * avatars.length)],
          gender: Math.random() > 0.5 ? 'female' : 'male',
          description: `Kênh chia sẻ chính thức về ${config.tags[i % config.tags.length]} trên ${platform.toUpperCase()}. Cảm ơn mọi người đã theo dõi!`,
          fans_count: Math.floor(Math.random() * 1500000) + 5000,
          follows_count: Math.floor(Math.random() * 500) + 50,
          ip_location: ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Bắc Kinh', 'Thượng Hải', 'Quảng Châu'][Math.floor(Math.random() * 6)],
        });
      }

      const resAuth = await fetch(`${CONFIG.supabase.url}/rest/v1/crawled_authors`, {
        method: 'POST',
        headers: {
          ...headers,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(authorsToInsert)
      });

      if (!resAuth.ok) {
        const errText = await resAuth.text();
        console.error(`  -> Lỗi chèn authors cho ${platform}:`, errText);
        continue;
      }
      
      const insertedAuthors = await resAuth.json() as any[];
      console.log(`  -> Đã tạo thành công ${insertedAuthors.length} tác giả (KOLs).`);

      // 3. Insert 35 posts
      const postsToInsert = [];
      for (let j = 1; j <= 35; j++) {
        const author = insertedAuthors[Math.floor(Math.random() * insertedAuthors.length)];
        const coverUrl = platformImages[(j - 1) % platformImages.length];
        const caption = config.captions[j % config.captions.length];
        
        const views = Math.floor(Math.random() * 800000) + 1000;
        const likes = Math.floor(views * (0.05 + Math.random() * 0.1));
        const comments = Math.floor(likes * (0.02 + Math.random() * 0.05));
        const shares = Math.floor(likes * (0.05 + Math.random() * 0.15));

        const publishedDate = new Date();
        publishedDate.setDate(publishedDate.getDate() - Math.floor(Math.random() * 30));

        postsToInsert.push({
          id: `post_${platform}_${j}_${Math.floor(Math.random() * 1000)}`,
          platform,
          platform_id: `plat_id_${platform}_${j}`,
          author_id: author.id,
          caption: `${caption} (Post #${j})`,
          cover_url: coverUrl,
          media_urls: [coverUrl],
          stats: {
            play_count: views,
            view_count: views,
            like_count: likes,
            comment_count: comments,
            share_count: shares,
          },
          raw: {
            title: `${platform.toUpperCase()} Post #${j}`,
            source: 'crawled'
          },
          tags: [config.tags[j % config.tags.length], 'ootd', 'fashion'],
          language: 'vi',
          published_at: publishedDate.toISOString(),
          crawled_at: new Date().toISOString(),
        });
      }

      const resPosts = await fetch(`${CONFIG.supabase.url}/rest/v1/crawled_posts`, {
        method: 'POST',
        headers: {
          ...headers,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(postsToInsert)
      });

      if (!resPosts.ok) {
        const errText = await resPosts.text();
        console.error(`  -> Lỗi chèn posts cho ${platform}:`, errText);
      } else {
        const insertedPosts = await resPosts.json() as any[];
        console.log(`  -> Đã tạo thành công ${insertedPosts.length} bài viết.`);
      }
    }

    console.log('\n========================================================');
    console.log('🎉 SEED DỮ LIỆU THÀNH CÔNG! HÃY TRUY CẬP LẠI DASHBOARD ĐỂ KIỂM TRA.');
    console.log('========================================================');

  } catch (err: any) {
    console.error('Lỗi ngoại lệ khi seeding:', err.message);
  }
}

seed();
