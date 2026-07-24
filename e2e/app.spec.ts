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
});
