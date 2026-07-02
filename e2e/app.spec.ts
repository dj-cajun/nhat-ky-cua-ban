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
  statusMessage: '테스트',
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
      content: '테스트 게시글',
      hasPhoto: false,
      hasVideo: false,
      hasLink: false,
      createdAt: new Date().toISOString(),
    },
  ],
  vote: [],
  guestbook: [],
};

test.describe('온보딩', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem('__E2E_ONBOARDING_INIT__')) return;
      sessionStorage.setItem('__E2E_ONBOARDING_INIT__', '1');
      localStorage.clear();
    });
    await page.goto('/');
  });

  test('온보딩 완료 (Zalo 로그인 생략)', async ({ page }) => {
    await expect(page.getByText('Nhật ký của bạn')).toBeVisible();
    await expect(page.getByText(/Zalo 로그인 완료/)).toBeVisible();

    await page.locator('select').first().selectOption({ label: 'THPT Marie Curie' });
    await page.locator('select').nth(1).selectOption({ label: 'Lớp 11A' });
    await page.getByRole('button', { name: '다음' }).click();
    await expect(page.getByText('힌트 데이터')).toBeVisible();

    await page.getByRole('button', { name: '시작하기' }).click();

    await expect(page.getByText('TODAY')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('미니 사진첩')).toBeVisible();
  });
});

test.describe('메인 홈', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      ({ votesJson, profile, posts }) => {
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

  test('5층 홈 레이아웃 표시', async ({ page }) => {
    await expect(page.getByText('TODAY')).toBeVisible();
    await expect(page.getByText('미니 사진첩')).toBeVisible();
    await expect(page.getByText(/학교 전체게시판/)).toBeVisible();
  });

  test('도토리 충전소 이동', async ({ page }) => {
    await page.getByLabel('도토리 충전소').click();
    await expect(page.getByText('도토리 충전소')).toBeVisible();
    await expect(page.getByText('보상형 동영상 시청')).toBeVisible();
  });

  test('투표 Lock 데모 (?vote=demo)', async ({ page }) => {
    await page.goto('/?vote=demo');
    await expect(page.getByText('5시 실명 투표')).toBeVisible({ timeout: 10000 });
  });
});
