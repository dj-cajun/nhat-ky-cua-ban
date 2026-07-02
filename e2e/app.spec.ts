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
  hintEncrypted: 'abc',
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

test.describe('Đăng nhập → Onboarding', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem('__E2E_ONBOARDING_INIT__')) return;
      sessionStorage.setItem('__E2E_ONBOARDING_INIT__', '1');
      localStorage.clear();
    });
    await page.goto('/');
  });

  test('Zalo login và hoàn tất onboarding', async ({ page }) => {
    await expect(page.getByText('Bắt đầu với Zalo')).toBeVisible();
    await page.getByRole('button', { name: 'Tiếp tục với Zalo' }).click();

    await expect(page.getByText('Nhật ký của bạn')).toBeVisible();
    await expect(page.getByText(/Đã đăng nhập Zalo/)).toBeVisible();

    await page.locator('select').first().selectOption({ label: 'THPT Marie Curie' });
    await page.locator('select').nth(1).selectOption({ label: 'Lớp 11A' });
    await page.getByRole('button', { name: 'Tiếp' }).click();
    await expect(page.getByText('Dữ liệu gợi ý')).toBeVisible();

    await page.getByRole('button', { name: 'Bắt đầu' }).click();

    await expect(page.getByText('TODAY')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Album ảnh mini')).toBeVisible();
  });
});

test.describe('Trang chủ', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      ({ votesJson, profile, posts }) => {
        localStorage.setItem('zalo_session', JSON.stringify({ id: 'test', name: 'Nguyễn Test' }));
        localStorage.setItem('onboarding_complete', 'true');
        localStorage.setItem('diary_profile', JSON.stringify(profile));
        localStorage.setItem('diary_posts', JSON.stringify(posts));
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
