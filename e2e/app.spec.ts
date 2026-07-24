import { test, expect } from '@playwright/test';

test.describe('v1 내 우주', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem('__E2E_V1__')) return;
      sessionStorage.setItem('__E2E_V1__', '1');
      localStorage.clear();
    });
    await page.goto('/?reset=1');
  });

  test('데모 가입 후 내 우주 진입', async ({ page }) => {
    await expect(page.getByText('로그인 방식을 선택하세요')).toBeVisible();
    await page.getByRole('button', { name: '데모로 바로 시작' }).click();
    await page.getByLabel(/약관/).check();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByPlaceholder('예: 민아').fill('테스트유저');
    await page.getByRole('button', { name: '내 다이어리 만들기' }).click();
    await expect(page.getByText('관계의 지도')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('서클 만들기')).toBeVisible();
  });

  test('서클 개척 데모 플로우', async ({ page }) => {
    await page.getByRole('button', { name: '데모로 바로 시작' }).click();
    await page.getByLabel(/약관/).check();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByPlaceholder('예: 민아').fill('개척자');
    await page.getByRole('button', { name: '내 다이어리 만들기' }).click();
    await page.getByRole('button', { name: /서클 만들기/ }).click();
    await page.getByPlaceholder('예: 금요일 스터디').fill('금요일 스터디');
    await page.getByRole('button', { name: '민서' }).click();
    await page.getByRole('button', { name: '준호' }).click();
    await page.getByRole('button', { name: '개척 요청 보내기' }).click();
    await expect(page.getByText('서클을 열어요')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: '서클 열기' }).click();
    await expect(page.getByText('금요일 스터디')).toBeVisible();
    await expect(page.getByText('개척자').first()).toBeVisible();
  });

  test('3인 추천 가입 데모 플로우', async ({ page }) => {
    await page.getByRole('button', { name: '데모로 바로 시작' }).click();
    await page.getByLabel(/약관/).check();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByPlaceholder('예: 민아').fill('개척자');
    await page.getByRole('button', { name: '내 다이어리 만들기' }).click();
    await page.getByRole('button', { name: /서클 만들기/ }).click();
    await page.getByPlaceholder('예: 금요일 스터디').fill('추천 서클');
    await page.getByRole('button', { name: '민서' }).click();
    await page.getByRole('button', { name: '준호' }).click();
    await page.getByRole('button', { name: '개척 요청 보내기' }).click();
    await page.getByRole('button', { name: '서클 열기' }).click();
    await page.getByRole('button', { name: /초대 가입/ }).click();
    await page.getByRole('button', { name: /유진으로 가입/ }).click();
    await expect(page.getByText('3명의 추천이 있어야')).toBeVisible();
    await page.getByRole('button', { name: '개척자' }).click();
    await page.getByRole('button', { name: '민서' }).click();
    await page.getByRole('button', { name: '서연' }).click();
    await page.getByRole('button', { name: '가입 신청', exact: true }).click();
    await expect(page.getByText(/추천 요청 중 · 0\/3/)).toBeVisible();

    // Switch to Minseo via localStorage session helper isn't in UI — use recommend inbox as pioneer
    // Pioneer left session when becoming Yujin; switch back by recreating flow through demo buttons
    await page.evaluate(() => {
      const profiles = JSON.parse(localStorage.getItem('v1_profiles_directory') || '[]');
      const pioneer = profiles.find((p: { displayName: string }) => p.displayName === '개척자');
      if (pioneer) localStorage.setItem('v1_profile', JSON.stringify(pioneer));
    });
    await page.goto('/?');
    await expect(page.getByText('관계의 지도')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: '추천 요청함' }).click();
    await page.getByRole('button', { name: '유진' }).click();
    await page.getByRole('button', { name: '추천하기' }).click();
    await expect(page.getByText(/공개되지 않습니다/)).toBeVisible();

    await page.evaluate(() => {
      const profiles = JSON.parse(localStorage.getItem('v1_profiles_directory') || '[]');
      const minseo = profiles.find((p: { displayName: string }) => p.displayName === '민서');
      if (minseo) localStorage.setItem('v1_profile', JSON.stringify(minseo));
    });
    await page.goto('/?');
    await page.getByRole('button', { name: '추천 요청함' }).click();
    await page.getByRole('button', { name: '유진' }).click();
    await page.getByRole('button', { name: '추천하기' }).click();

    await page.evaluate(() => {
      const profiles = JSON.parse(localStorage.getItem('v1_profiles_directory') || '[]');
      const seoyeon = profiles.find((p: { displayName: string }) => p.displayName === '서연');
      if (seoyeon) localStorage.setItem('v1_profile', JSON.stringify(seoyeon));
    });
    await page.goto('/?');
    await page.getByRole('button', { name: '추천 요청함' }).click();
    await page.getByRole('button', { name: '유진' }).click();
    await page.getByRole('button', { name: '추천하기' }).click();

    await page.evaluate(() => {
      const profiles = JSON.parse(localStorage.getItem('v1_profiles_directory') || '[]');
      const yujin = profiles.find((p: { displayName: string }) => p.displayName === '유진');
      if (yujin) localStorage.setItem('v1_profile', JSON.stringify(yujin));
    });
    await page.goto('/?');
    await expect(page.getByText('추천 서클')).toBeVisible({ timeout: 10000 });
  });
});
