const fs = require('fs');
const path = require('path');

// Đọc .env.local từ thư mục dashboard
const envPath = path.resolve(__dirname, '../dashboard/.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
  if (match) {
    const key = match[1];
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    if (val.startsWith("'") && val.endsWith("'")) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Không tìm thấy NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY!');
  process.exit(1);
}

console.log(`Kết nối tới Supabase: ${supabaseUrl}`);

async function run() {
  const url = `${supabaseUrl}/auth/v1/admin/users`;
  const email = 'admin_test@sinomedia.vn';
  const password = 'testpassword123';

  console.log(`Đang đăng ký/cập nhật tài khoản admin: ${email}`);

  let userId = null;

  // Thử tạo user
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({
        email: email,
        password: password,
        email_confirm: true
      })
    });

    const resJson = await response.json();
    if (response.ok) {
      console.log('Tạo tài khoản auth thành công:', resJson.id);
      userId = resJson.id;
    } else {
      if (resJson.error_code === 'email_exists' || (resJson.msg && (resJson.msg.includes('already exists') || resJson.msg.includes('already been registered')))) {
        console.log('Tài khoản đã tồn tại, đang lấy thông tin...');
        const getUrl = `${supabaseUrl}/auth/v1/admin/users`;
        const listResponse = await fetch(getUrl, {
          method: 'GET',
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`
          }
        });
        const listJson = await listResponse.json();
        const user = listJson.users ? listJson.users.find(u => u.email === email) : null;
        if (user) {
          userId = user.id;
          console.log(`Đã lấy được ID của user: ${userId}`);
        }
      } else {
        console.error('Lỗi khi tạo user:', resJson);
      }
    }

    if (userId) {
      // 1. Chèn hoặc cập nhật Profiles
      console.log('Đang kiểm tra/chèn vào bảng public.profiles...');
      const profileUrl = `${supabaseUrl}/rest/v1/profiles`;
      
      const profResponse = await fetch(`${profileUrl}?id=eq.${userId}`, {
        method: 'GET',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`
        }
      });
      const profList = await profResponse.json();
      console.log('Kết quả truy vấn profiles:', profList);
      
      if (!Array.isArray(profList) || profList.length === 0) {
        console.log('Chèn profile mới...');
        const insertProfRes = await fetch(profileUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            id: userId,
            email: email,
            name: 'admin_test'
          })
        });
        if (insertProfRes.ok) {
          console.log('Đã chèn profile thành công.');
        } else {
          console.error('Lỗi chèn profile:', await insertProfRes.json());
        }
      } else {
        console.log('Profile đã tồn tại.');
      }

      // 2. Chèn hoặc cập nhật Team Members
      console.log('Đang kiểm tra/chèn vào bảng public.team_members...');
      const memberUrl = `${supabaseUrl}/rest/v1/team_members`;
      
      const memberResponse = await fetch(`${memberUrl}?user_id=eq.${userId}`, {
        method: 'GET',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`
        }
      });
      const memberList = await memberResponse.json();
      console.log('Kết quả truy vấn team_members:', memberList);

      if (!Array.isArray(memberList) || memberList.length === 0) {
        console.log('Chèn team member mới với quyền admin...');
        const insertMemRes = await fetch(memberUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            workspace_id: '00000000-0000-0000-0000-000000000000',
            user_id: userId,
            role_id: 'admin',
            status: 'active'
          })
        });
        if (insertMemRes.ok) {
          console.log('Đã chèn team_members thành công với quyền admin.');
        } else {
          console.error('Lỗi chèn team_members:', await insertMemRes.json());
        }
      } else {
        const member = memberList[0];
        if (member && member.role_id !== 'admin') {
          console.log('Đang nâng cấp quyền lên admin...');
          const updateMemRes = await fetch(`${memberUrl}?id=eq.${member.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': serviceRoleKey,
              'Authorization': `Bearer ${serviceRoleKey}`
            },
            body: JSON.stringify({
              role_id: 'admin'
            })
          });
          if (updateMemRes.ok) {
            console.log('Đã nâng cấp quyền admin thành công.');
          } else {
            console.error('Lỗi nâng cấp quyền admin:', await updateMemRes.json());
          }
        } else {
          console.log('Team member đã có quyền admin.');
        }
      }
    }

  } catch (err) {
    console.error('Lỗi thực thi:', err);
  }
}

run();
