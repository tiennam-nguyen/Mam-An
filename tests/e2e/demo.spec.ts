import { test,expect } from '@playwright/test';
test('offline sample → correction → save/reload → glucose → week → report',async({page,context})=>{
 const apiCalls:string[]=[];page.on('request',r=>{if(r.url().includes('/api/'))apiCalls.push(r.url());});
 await page.goto('/');await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
 await page.reload();await expect(page.getByRole('heading',{name:/Bữa ăn quen/})).toBeVisible();
 await page.screenshot({path:'test-results/home-mobile.png',fullPage:true});
 await context.setOffline(true);await page.goto('/analyze');await page.getByRole('button',{name:'Dùng bữa ăn mẫu'}).click();
 await expect(page.getByTestId('carb-total')).toContainText('32,8');
 const rice=page.locator('article').filter({has:page.getByRole('heading',{name:'Cơm trắng',exact:true})});
 await rice.getByRole('button',{name:'0.5×',exact:true}).click();await expect(page.getByTestId('carb-total')).toContainText('18,1');
 await page.getByRole('button',{name:'Lưu bữa ăn',exact:true}).click();await expect(page.getByRole('heading',{name:'Bữa ăn đã lưu'})).toBeVisible();
 await page.reload();await expect(page.getByText('18,1 g carb')).toBeVisible();
 await page.getByRole('link',{name:'Thêm số đo',exact:true}).click();await page.getByLabel('Giá trị', {exact:true}).fill('6.7');await page.getByRole('button',{name:'Lưu số đo'}).click();await expect(page.getByText('6,7 mmol/L')).toBeVisible();
 await page.getByRole('link',{name:'Tuần của tôi',exact:true}).click();await expect(page.getByText('6,7 mmol/L')).toBeVisible();await page.getByRole('link',{name:'Xem báo cáo'}).click();await expect(page.getByRole('heading',{name:'Báo cáo tuần · Mâm An'})).toBeVisible();
 await page.emulateMedia({media:'print'});await expect(page.locator('header')).toBeHidden();await page.pdf({path:'test-results/weekly-report.pdf',format:'A4'});await page.screenshot({path:'test-results/report.png',fullPage:true});expect(apiCalls).toEqual([]);
});
test('manual unknown stays unknown, demo reset preserves user records',async({page})=>{
 await page.goto('/analyze');await page.getByRole('button',{name:'Nhập món thủ công'}).click();await page.getByRole('button',{name:'＋ Món tự nhập',exact:true}).click();await page.getByLabel('Tên hiển thị').fill('Món riêng');await expect(page.getByTestId('carb-total')).toHaveText('Chưa có dữ liệu');await page.getByRole('button',{name:'Lưu bữa ăn',exact:true}).click();
 await page.goto('/demo');await page.getByRole('button',{name:'Tạo dữ liệu mẫu'}).click();await expect(page.getByRole('status')).toContainText('Đã chuẩn bị');await page.getByRole('button',{name:'Đặt lại dữ liệu mẫu',exact:true}).click();await page.getByRole('button',{name:'Xác nhận đặt lại mẫu'}).click();await expect(page.getByRole('status')).toContainText('Đã chuẩn bị');
 await page.goto('/history');await expect(page.getByRole('heading',{name:'Món riêng',exact:true})).toBeVisible();await expect(page.locator('.history-row')).toHaveCount(8);
});
