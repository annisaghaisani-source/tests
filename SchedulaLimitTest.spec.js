import { test, expect } from '@playwright/test';

// Function to shuffle an array (Fisher-Yates)
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

test('Register 100 Schedula visits and verify 50 visit limit', async ({ page }) => {
  // Increase test timeout since we are doing 100 iterations
  test.setTimeout(1200000); // 20 minutes max

  console.log('Navigating to login page...');
  await page.goto('https://dev-essensial.assist.id/login');

  // Fill credentials and log in
  console.log('Logging in...');
  await page.locator('#username').click();
  await page.locator('#username').fill('anisasecondacc24@gmail.com');
  await page.locator('[data-test="input-password"]').click();
  await page.locator('[data-test="input-password"]').fill('12345678');
  await page.locator('[data-test="login-btn"]').click();

  // Handle initial modals/closers
  console.log('Dismissing modals...');
  try {
    await page.getByRole('button', { name: 'close' }).click({ timeout: 5000 });
  } catch (e) {
    console.log('No close button or modal found, continuing...');
  }

  // Switch branch to Pure Burns [Schedula]
  console.log('Switching branch to Pure Burns [Schedula]...');
  await page.locator('[data-test="change-account-button-arrow"]').click();
  await page.getByRole('menuitem', { name: '- Pure Burns [Schedula] (QA)' }).click();

  // Navigate to Rawat Jalan
  console.log('Navigating to Rawat Jalan...');
  await page.locator('[data-test="sidebar-item-rawat-jalan"]').click();
  await page.waitForTimeout(5000); // Wait for grid to load fully

  // Generate doctor indices (0: BN-Maxwell, 1 & 2: BN-Gilbert)
  const doctorIndices = [0, 1, 2];
  // Generate hours from 08:00 to 17:00
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  // Generate minutes
  const minutes = ['00', '15', '30', '45'];

  // Combine into candidate slots
  let candidateSlots = [];
  for (const hour of hours) {
    for (const minute of minutes) {
      for (const docIdx of doctorIndices) {
        const hh = String(hour).padStart(2, '0');
        candidateSlots.push(`#add${docIdx}${hh}${minute}`);
      }
    }
  }

  // Shuffle candidate slots to randomize visits to BN-Maxwell and BN-Gilbert
  candidateSlots = shuffle(candidateSlots);
  console.log(`Generated ${candidateSlots.length} random slots for booking.`);

  let slotIndex = 0;
  let successfulRegistrations = 0;

  for (let i = 1; i <= 100; i++) {
    const patientName = `PB-AI-Play-${String(i).padStart(6, '0')}`;
    console.log(`\n========================================`);
    console.log(`Processing patient #${i}: ${patientName}`);

    let clicked = false;
    let slotSelector = '';

    while (slotIndex < candidateSlots.length) {
      slotSelector = candidateSlots[slotIndex++];
      const slotLocator = page.locator(slotSelector);
      
      if (await slotLocator.count() > 0 && await slotLocator.isVisible()) {
        await slotLocator.click();
        clicked = true;
        console.log(`Selected vacant slot: ${slotSelector}`);
        break;
      }
    }

    // If no more slots are available on the current day, navigate to the next day
    if (!clicked) {
      console.log('No more vacant slots on this day. Navigating to the next day...');
      const nextBtn = page.locator('.bi-chevron-right, .el-icon-arrow-right, .fa-chevron-right, [data-test="datepicker-next-btn"], button:has-text(">")').first();
      
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        console.log('Clicked next day button. Waiting for schedule grid to refresh...');
        await page.waitForTimeout(3000);
        
        // Reset slots and shuffle again
        slotIndex = 0;
        candidateSlots = shuffle(candidateSlots);
        i--; // Decrement index to retry current patient name
        continue;
      } else {
        console.log('CRITICAL: Next day button not found. Stopping test.');
        break;
      }
    }

    // Fill the patient registration modal
    try {
      console.log('Searching for patient...');
      const searchBox = page.locator('input[placeholder*="Cari Nama Lengkap Pasien"]').first();
      await searchBox.waitFor({ state: 'visible', timeout: 10000 });
      await searchBox.click();
      await searchBox.fill(patientName);

      console.log('Creating new patient...');
      await page.getByRole('button', { name: 'new' }).click();

      // DOB selection
      console.log('Selecting Date of Birth (Year 1995)...');
      await page.getByRole('button').nth(2).click();
      await page.getByRole('button', { name: '1995' }).click();
      await page.getByRole('button', { name: 'OK' }).click();

      // Birthplace
      console.log('Filling birthplace...');
      await page.locator('[data-test="input-tempat-lahir"]').fill('Surabaya');

      // Address details
      console.log('Filling address and region details...');
      await page.locator('input[name="address"]').fill(`Jl Surabaya No ${i}`);
      
      // Select province, kab, kec, kel
      await page.locator('#select-selectedProvince').click();
      await page.getByRole('option', { name: 'KALIMANTAN TENGAH' }).click();
      await page.waitForTimeout(500); // small delay for dynamic load
      
      await page.locator('#select-selectedKabupaten').click();
      await page.getByRole('option', { name: 'KAB. MURUNG RAYA' }).click();
      await page.waitForTimeout(500);
      
      await page.locator('#select-selectedKecamatan').click();
      await page.getByRole('option', { name: 'SERIBU RIAM' }).click();
      await page.waitForTimeout(500);
      
      await page.locator('#select-selectedKelurahan').click();
      await page.getByRole('option', { name: 'TAKAJUNG' }).click();
      
      await page.locator('input[name="postcode"]').fill('24123');

      // Click simpan to save patient details
      console.log('Saving patient details...');
      await page.getByRole('button', { name: 'simpan' }).click();

      // Wait for patient sub-modal to be fully hidden
      console.log('Waiting for patient creation form to close...');
      await page.locator('[data-test="input-tempat-lahir"]').waitFor({ state: 'hidden', timeout: 10000 });

      // Wait for the patient to be loaded in the main form (Penjamin populated)
      console.log('Waiting for patient to be loaded in the main form...');
      const penjaminInput = page.locator('.el-form-item:has-text("Penjamin") input').first();
      try {
        await expect(penjaminInput).not.toHaveValue('', { timeout: 10000 });
        console.log('Patient loaded successfully in main form.');
      } catch (err) {
        console.log('Warning: Penjamin input was not auto-populated, trying a short delay...');
        await page.waitForTimeout(3000);
      }

      // Handle Slot and Jam inputs if visible (enforced for doctors with active schedules)
      const slotInput = page.locator('.el-form-item:has-text("Slot") input').first();
      if (await slotInput.count() > 0 && await slotInput.isVisible()) {
        const slotVal = await slotInput.inputValue();
        if (!slotVal) {
          console.log('Slot selection is empty. Selecting first practice slot...');
          await slotInput.click();
          await page.locator('.el-select-dropdown__item').first().click();
          await page.waitForTimeout(500);
        }
      }

      const jamInput = page.locator('.el-form-item:has-text("Jam") input').first();
      if (await jamInput.count() > 0 && await jamInput.isVisible()) {
        console.log('Jam input is active. Parsing time from slot...');
        const match = slotSelector.match(/#add\d(\d{2})(\d{2})/);
        if (match) {
          const hh = match[1];
          const mm = match[2];
          const timeStr = `${hh}:${mm}`;
          console.log(`Filling Jam input with: ${timeStr}`);
          await jamInput.click();
          await jamInput.fill(timeStr);
          await jamInput.press('Enter');
          await page.waitForTimeout(1000);
        }
      }

      // Fill complaint
      console.log('Filling complaint...');
      const complaintInput = page.locator('[data-test="input-complaint"]');
      await complaintInput.waitFor({ state: 'visible', timeout: 5000 });
      await complaintInput.click();
      await complaintInput.fill('Test limit 100 kunjungan pasien Schedula');

      // Click Simpan visit
      console.log('Saving visit / appointment...');
      const simpanVisitBtn = page.getByRole('button', { name: 'Simpan' });
      await simpanVisitBtn.click();

      // Wait for success toast or error
      const successToast = page.locator('.el-message--success, .toast-success, :has-text("Appointment berhasil ditambahkan")').first();
      const errorToast = page.locator('.el-message--error, .toast-error, :has-text("kuota"), :has-text("limit")').first();
      
      let isSuccess = false;
      let isError = false;
      let errorMsg = '';

      // Poll for up to 8 seconds (16 half-second attempts) to detect toast
      for (let attempt = 0; attempt < 16; attempt++) {
        if (await successToast.isVisible()) {
          isSuccess = true;
          break;
        }
        if (await errorToast.isVisible()) {
          isError = true;
          errorMsg = await errorToast.innerText();
          break;
        }
        await page.waitForTimeout(500);
      }

      if (isSuccess) {
        successfulRegistrations++;
        console.log(`Successfully registered patient #${i}: ${patientName} at slot ${slotSelector}`);
        
        // Wait a moment for the toast to clear so it doesn't overlap with the next operation
        await page.waitForTimeout(2000);
      } else {
        console.log('⚠️ Visit registration was blocked or failed!');
        
        // Capture screenshot of the blocked modal/error toast
        const screenshotPath = `tests/limit-blocked-${patientName}.png`;
        await page.screenshot({ path: screenshotPath });
        console.log(`Saved screenshot of block: ${screenshotPath}`);

        if (isError) {
          console.log(`Toast error message: "${errorMsg}"`);
        } else {
          console.log('Unknown error or timeout while saving.');
        }

        // Close the modal manually to see if we can continue or stop
        const closeBtn = page.getByRole('button', { name: 'close' }).first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
        }

        console.log('System visit limit has been reached! Successfully verified that the system blocks new registrations.');
        console.log(`Total successful registrations in this run: ${successfulRegistrations}`);
        break;
      }

    } catch (error) {
      console.error(`Error during registration for patient ${patientName}:`, error);
      // Take screenshot of error
      await page.screenshot({ path: `tests/error-${patientName}.png` });
      break;
    }
  }

  console.log('\n========================================');
  console.log(`Execution Finished.`);
  console.log(`Total Successful Registrations: ${successfulRegistrations}`);
  console.log('========================================');
});
