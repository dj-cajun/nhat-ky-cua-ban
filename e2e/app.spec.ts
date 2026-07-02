import { test, expect } from '@playwright/test';

function todayVN(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function completeVotesScript(): string {
  const today = todayVN();
  return JSON.stringify(
    Array.from({ length: 12 }, (_, i) => ({
      questionIndex: i + 1,
      selectedUserId: 'cm-1',
      hintShield: 'height',
      date: today,
    })),
  );
}

const TEST_PROFILE = {
  id: 'user-test',
  zaloId: 'test',
  realName: 'Nguyễn Test',
  surname: 'Nguyễn',
  schoolName: 'THPT Marie Curie',
  className: 'Lớp 11A',
  classId: 'THPT Marie Curie-Lớp 11A',
  statusMessage: 'test',
  dotoriBalance: 5,
  visitCountToday: 10,
  visitCountTotal: 100,
  hintEncrypted: '{"v":1,"digest":{"gender":"x","heightRange":"x","mbtiPrefix":"x","commute":"x"},"shields":{"surname":"Họ: Nguyễn","height":"Cao","gender":"Nữ","commute":"Xe máy"}}',
};

const TEST_POSTS = {
  diary: [],
  school: [
    {
      id: 's1',
      authorId: 'cm-1',
      boardType: 'school',
      content: 'Bài test',
      hasPhoto: false,
      hasVideo: false,
      hasLink: false,
      createdAt: new Date().toISOString(),
    },
  ],
  vote: [],
  guestbook: [],
};

/** 개척단 완료 상태 — 홈 진입 허용 */
function activeFoundingStorage(profileId: string): string {
  const now = new Date().toISOString();
  return JSON.stringify({
    'THPT Marie Curie::Lớp 11A': {
      classKey: 'THPT Marie Curie::Lớp 11A',
      schoolName: 'THPT Marie Curie',
      className: 'Lớp 11A',
      status: 'active',
      founderUserId: profileId,
      founderName: 'Nguyễn Test',
      inviteToken: 'fc_e2e',
      members: [
        { userId: profileId, name: 'Nguyễn Test', joinedAt: now },
        { userId: 'cm-02', name: 'Bạn B', joinedAt: now },
        { userId: 'cm-03', name: 'Bạn C', joinedAt: now },
      ],
      quizzes: ['demo-1', 'demo-2', 'demo-3'],
      createdAt: now,
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      activatedAt: now,
    },
  });
}

async function completeFoundingDemo(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /mô phỏng bạn cùng lớp/i }).click();
  await page.getByRole('button', { name: /mô phỏng bạn cùng lớp/i }).click();
  const inputs = page.locator('input[type="text"]');
  await inputs.nth(0).fill('demo-1');
  await inputs.nth(1).fill('demo-2');
  await inputs.nth(2).fill('demo-3');
  await page.getByRole('button', { name: /Kích hoạt lớp/i }).click();
}

test.describe('Đăng nhập → Onboarding', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem('__E2E_ONBOARDING_INIT__')) return;
      sessionStorage.setItem('__E2E_ONBOARDING_INIT__', '1');
      localStorage.clear();
    });
    await page.goto('/');
  });

  test('Zalo login và hoàn tất onboarding + khai phá lớp', async ({ page }) => {
    await expect(page.getByText('Bắt đầu với Zalo')).toBeVisible();
    await page.getByRole('button', { name: 'Tiếp tục với Zalo' }).click();

    await expect(page.getByText('Nhật ký của bạn')).toBeVisible();
    await expect(page.getByText(/Đã đăng nhập Zalo/)).toBeVisible();

    await page.locator('select').first().selectOption({ label: 'THPT Marie Curie' });
    await page.locator('select').nth(1).selectOption({ label: 'Lớp 11A' });
    await page.getByRole('button', { name: 'Tiếp' }).click();
    await expect(page.getByText('Dữ liệu gợi ý')).toBeVisible();

    await page.getByRole('button', { name: 'Bắt đầu' }).click();

    await expect(page.getByText(/Đội khai phá/i)).toBeVisible({ timeout: 10000 });
    await completeFoundingDemo(page);

    await expect(page.getByText('TODAY')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Album ảnh mini')).toBeVisible();
  });
});

test.describe('Trang chủ', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      ({ votesJson, profile, posts, foundingJson }) => {
        localStorage.setItem('zalo_session', JSON.stringify({ id: 'test', name: 'Nguyễn Test' }));
        localStorage.setItem('onboarding_complete', 'true');
        localStorage.setItem('diary_profile', JSON.stringify(profile));
        localStorage.setItem('diary_posts', JSON.stringify(posts));
        localStorage.setItem('diary_class_foundings', foundingJson);
        if (window.location.search.includes('vote=demo')) {
          localStorage.removeItem('diary_votes');
        } else {
          localStorage.setItem('diary_votes', votesJson);
        }
      },
      {
        votesJson: completeVotesScript(),
        profile: TEST_PROFILE,
        posts: TEST_POSTS,
        foundingJson: activeFoundingStorage('user-test'),
      },
    );
    await page.goto('/');
  });

  test('Hiển thị layout 5 tầng', async ({ page }) => {
    await expect(page.getByText('TODAY')).toBeVisible();
    await expect(page.getByText('Album ảnh mini')).toBeVisible();
    await expect(page.getByText(/Bảng tin toàn trường/)).toBeVisible();
  });

  test('Đi tới trạm Dotori', async ({ page }) => {
    await page.getByLabel('Trạm nạp Dotori').click();
    await expect(page.getByText('Trạm nạp Dotori')).toBeVisible();
    await expect(page.getByText('Xem video thưởng')).toBeVisible();
  });

  test('Vote Lock demo (?vote=demo)', async ({ page }) => {
    await page.goto('/?vote=demo');
    await expect(page.getByText('Bỏ phiếu danh tính 17h')).toBeVisible({ timeout: 10000 });
  });
});
