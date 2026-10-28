import { test, expect } from "@playwright/test";

test("configures, validates and downloads only the firmware files", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Build your micro-ROS node" })).toBeVisible();
  await expect(page.getByText("Valid configuration")).toBeVisible();
  await expect(page.getByLabel("Generated code for main.cpp")).toContainText("counter_0 + 1");
  await page.getByRole("button", { name: "2 Communication", exact: true }).click();
  await page.getByLabel("Network name (SSID)").fill("Laboratory");
  await page.getByLabel("Password", { exact: true }).fill("password-not-stored");
  await page.getByLabel("Agent IP").fill("999.1.1.1");
  await expect(page.getByRole("button", { name: "main.cpp", exact: true }).first()).toBeDisabled();
  await page.getByLabel("Agent IP").fill("192.168.1.20");
  await page.getByLabel("Publishing period (ms)").fill("500");
  const mainDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "main.cpp", exact: true }).first().click();
  const main = await mainDownload;
  expect(main.suggestedFilename()).toBe("main.cpp");
  const mainContent = await (await main.createReadStream())!.toArray();
  expect(Buffer.concat(mainContent).toString()).toContain("createTimer(timer_0, 500");
  const iniDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "platformio.ini", exact: true }).first().click();
  expect((await iniDownload).suggestedFilename()).toBe("platformio.ini");
  await page.getByRole("button", { name: "USB / Serial", exact: true }).click();
  await expect(page.getByLabel("Agent IP")).toHaveCount(0);
  await expect(page.getByLabel("Generated code for main.cpp")).toContainText("ros.beginSerial");
  await expect(page.getByLabel("Generated code for main.cpp")).not.toContainText("wifiConnected");
  await page.getByRole("button", { name: "Subscriber", exact: true }).click();
  await expect(page.getByLabel("ROS 2 topic")).toHaveValue("/led_1");
  await page.getByRole("button", { name: "Delete entity" }).click();
  await expect(page.getByText("2 entities · 2 handles")).toBeVisible();
  await expect(page.getByText("Draft saved in this browser")).toBeVisible();
  const saved = await page.evaluate(() => localStorage.getItem("microros-studio-v1"));
  expect(saved).not.toContain("password-not-stored");
  await page.reload();
  await expect(page.getByLabel("Node name")).toHaveValue("micro_ros_node");
  await expect(page.getByLabel("Generated code for main.cpp")).toContainText("counter_0 + 1");
  await page.getByRole("button", { name: "2 Communication", exact: true }).click();
  await page.getByRole("button", { name: "WiFi / UDP", exact: true }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "Help" }).click();
  const help=page.getByRole("dialog",{name:"Element help"});
  await expect(help).toBeVisible();
  await expect(help.getByRole("link",{name:"Download base project"})).toHaveCount(0);
  await expect(help.getByText("1. Download the base project.",{exact:true})).toHaveCount(0);
  await help.getByText("Data types and topics",{exact:true}).click();
  await expect(help.getByText("std_msgs / Bool",{exact:true})).toBeVisible();
  await help.getByText("Inputs and sensors",{exact:true}).click();
  await help.getByText("6-axis inertial sensor · MPU-6050",{exact:true}).click();
  await expect(help.getByText("/acceleration",{exact:false})).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button",{name:"View instructions",exact:true}).click();
  const instructions=page.getByRole("dialog",{name:"Next steps"});
  await expect(instructions).toBeVisible();
  await expect(instructions.getByRole("link",{name:"Download base project"})).toBeVisible();
  await expect(instructions.getByText("1. Download the base project.",{exact:true})).toBeVisible();
  await expect(instructions.locator("pre").first()).toContainText("ROS_DOMAIN_ID=13");
  await expect(instructions.getByText("Data types and topics",{exact:true})).toHaveCount(0);
  await page.getByRole("button",{name:"Close instructions",exact:true}).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.screenshot({ path: "test-results/studio-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Build your micro-ROS node" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/studio-mobile.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("wizard: sensors, I2C, outputs and review", async ({ page }) => {
  const runtimeErrors:string[]=[];page.on("pageerror",e=>runtimeErrors.push(e.message));
  await page.goto("/");
  const wizard=page.getByRole("complementary",{name:"micro-ROS application wizard"});
  await expect(wizard.getByText("Step 1 of 5")).toBeVisible();
  await wizard.getByRole("button",{name:"Next",exact:true}).click();
  await expect(page.getByRole("combobox",{name:"SDA",exact:true})).toHaveValue("21");
  await wizard.getByRole("button",{name:"Next",exact:true}).click();
  await page.getByRole("button",{name:"9-axis orientation sensor · BNO055",exact:true}).click();
  await expect(page.getByLabel("ROS 2 topic")).toHaveValue("/orientation");
  await page.getByRole("button",{name:"Infrared ToF distance sensor · VL53L0Xv2",exact:true}).click();
  await expect(page.getByLabel("I2C address")).toHaveValue("41");
  await expect(page.getByLabel("Generated code for main.cpp")).toContainText("sensor_3.begin(41)");
  await page.getByRole("button",{name:"9-axis orientation sensor · BNO055 /orientation"}).click();
  await page.getByLabel("I2C address").selectOption("41");
  await expect(page.getByRole("button",{name:"main.cpp",exact:true}).first()).toBeDisabled();
  await page.getByLabel("I2C address").selectOption("40");
  await expect(page.getByRole("button",{name:"main.cpp",exact:true}).first()).toBeEnabled();
  await page.getByRole("button",{name:"4 Outputs and actuators",exact:true}).click();
  await page.getByRole("button",{name:"PWM servo motor",exact:true}).click();
  await expect(page.getByLabel("Servo signal")).toBeVisible();
  await expect(page.getByLabel("Generated code for main.cpp")).toContainText("ledcSetup(0, 50, 16)");
  await wizard.getByRole("button",{name:"Next",exact:true}).click();
  await expect(wizard.getByText("Step 5 of 5")).toBeVisible();
  await wizard.getByRole("button",{name:"View generated code"}).click();
  await page.getByRole("button",{name:"platformio.ini",exact:true}).nth(1).click();
  await expect(page.getByLabel("Generated code for platformio.ini")).toContainText("Adafruit_VL53L0X");
  await page.reload();
  await expect(page.getByText("5 entities · 5 handles")).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("light and dark themes update the UI and diagram and persist", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Switch to dark theme" })).toBeVisible();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  const lightBackground = await page.locator("body").evaluate(e => getComputedStyle(e).backgroundColor);
  await expect(page.locator(".react-flow")).toHaveClass(/light/);
  await page.screenshot({ path: "test-results/theme-light.png", fullPage: true });
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator(".react-flow")).toHaveClass(/dark/);
  expect(await page.locator("body").evaluate(e => getComputedStyle(e).backgroundColor)).not.toBe(lightBackground);
  await page.reload();
  await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({ path: "test-results/theme-dark.png", fullPage: true });
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});


test("palette selection is independent of mode and persists", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const selector = page.getByRole("combobox", { name: "Color theme" });
  await expect(selector).toHaveValue("tweakcn");
  await expect(selector.locator("option")).toHaveText(["Default", "invincible theme", "Clean Slate"]);
  const current = await page.locator("body").evaluate(e => getComputedStyle(e).backgroundColor);
  await selector.selectOption("default");
  await expect(page.locator("html")).toHaveAttribute("data-palette", "default");
  expect(await page.locator("body").evaluate(e => getComputedStyle(e).backgroundColor)).not.toBe(current);
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(selector).toHaveValue("default");
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(selector).toHaveValue("default");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await selector.selectOption("tweakcn");
  await expect(page.locator("html")).toHaveAttribute("data-palette", "tweakcn");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await selector.selectOption("clean-slate");
  await expect(page.locator("html")).toHaveAttribute("data-palette","clean-slate");
  const primary=()=>page.locator("html").evaluate(e=>getComputedStyle(e).getPropertyValue("--primary").trim());
  await expect.poll(primary).toBe("oklch(0.5854 0.2041 277.1173)");
  await page.reload();
  await expect(selector).toHaveValue("clean-slate");
  await expect.poll(primary).toBe("oklch(0.5854 0.2041 277.1173)");
  await page.getByRole("button",{name:"Switch to dark theme"}).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(selector).toHaveValue("clean-slate");
  await expect.poll(primary).not.toBe("oklch(0.5854 0.2041 277.1173)");
  await selector.selectOption("default");
  await expect(page.locator("html")).toHaveAttribute("data-palette","default");
  await expect(page.locator("html")).toHaveClass(/dark/);
});


test("final GPIO conflict alert and large diagram navigation", async ({page})=>{
 await page.goto("/");
 await page.getByRole("button",{name:"3 Inputs and sensors",exact:true}).click();
 await page.getByRole("button",{name:"Generic digital input · GPIO",exact:true}).click();
 await page.getByRole("combobox",{name:"Signal",exact:true}).selectOption("2");
 await page.getByRole("button",{name:"5 Review and generate",exact:true}).click();
 const wizard=page.getByRole("complementary",{name:"micro-ROS application wizard"});
 const alert=wizard.getByRole("alert",{name:"Configuration conflicts"});
 await expect(alert).toContainText("GPIO 2 conflict");
 await expect(alert).toContainText("LED / digital output (/led)");
 await expect(alert).toContainText("Generic digital input · GPIO (/digital_input)");
 await expect(page.getByRole("button",{name:"main.cpp",exact:true}).first()).toBeDisabled();
 await expect(wizard.getByRole("button",{name:"View generated code"})).toBeDisabled();
 await page.getByRole("combobox",{name:"Signal",exact:true}).selectOption("4");
 await expect(alert).toHaveCount(0);
 await expect(page.getByRole("button",{name:"main.cpp",exact:true}).first()).toBeEnabled();
 for(let i=0;i<6;i++)await page.getByRole("button",{name:"Publisher + timer",exact:true}).click();
 const canvas=page.locator(".react-flow"),viewport=page.locator(".react-flow__viewport");
 const position=()=>viewport.evaluate(e=>{const m=new DOMMatrixReadOnly(getComputedStyle(e).transform);return {y:m.m42,zoom:m.a};});
 const controls=page.getByRole("group",{name:"Diagram controls"});
 const diagramBox=await page.getByLabel("Program diagram",{exact:true}).boundingBox();
 const controlsBox=await controls.boundingBox();
 expect(diagramBox!.x+diagramBox!.width-controlsBox!.x-controlsBox!.width).toBeCloseTo(8,0);
 expect(diagramBox!.y+diagramBox!.height-controlsBox!.y-controlsBox!.height).toBeCloseTo(8,0);
 await expect(controls.getByRole("button",{name:"Fit diagram",exact:true})).toHaveText("");
 await expect(controls.getByRole("button",{name:"Fullscreen diagram",exact:true})).toHaveText("");
 await expect(page.getByText("Shift + scroll ↔",{exact:false})).toBeVisible();
 for (const delta of [{deltaY:160,deltaX:0,shiftKey:true},{deltaY:0,deltaX:160,shiftKey:true},{deltaY:0,deltaX:160,shiftKey:false}]) {
   const initial=await position();
   const x=await viewport.evaluate(e=>new DOMMatrixReadOnly(getComputedStyle(e).transform).m41);
   await canvas.dispatchEvent("wheel",{...delta,bubbles:true,cancelable:true});
   await expect.poll(async()=>viewport.evaluate(e=>new DOMMatrixReadOnly(getComputedStyle(e).transform).m41)).toBeLessThan(x);
   expect((await position()).zoom).toBeCloseTo(initial.zoom,3);
   expect((await position()).y).toBeCloseTo(initial.y,3);
 }
 await canvas.hover();
 const realX=await viewport.evaluate(e=>new DOMMatrixReadOnly(getComputedStyle(e).transform).m41);
 await page.keyboard.down("Shift");
 await page.mouse.wheel(0,160);
 await page.keyboard.up("Shift");
 await expect.poll(async()=>viewport.evaluate(e=>new DOMMatrixReadOnly(getComputedStyle(e).transform).m41)).toBeLessThan(realX);
 const before=await position();
 await canvas.hover();await page.mouse.wheel(0,400);
 await expect.poll(async()=> (await position()).y).not.toBe(before.y);
 expect((await position()).zoom).toBeCloseTo(before.zoom,3);
 await page.getByRole("button",{name:"Zoom out diagram",exact:true}).click();
 await expect.poll(async()=> (await position()).zoom).toBeLessThan(before.zoom);
 const smaller=(await position()).zoom;
 await page.getByRole("button",{name:"Zoom in diagram",exact:true}).click();
 await expect.poll(async()=> (await position()).zoom).toBeGreaterThan(smaller);
 await page.getByRole("button",{name:"Fit diagram",exact:true}).click();
 await expect.poll(async()=> (await position()).zoom).toBeLessThan(.5);
 await page.getByRole("button",{name:"Fullscreen diagram",exact:true}).click();
 await expect(page.getByRole("button",{name:"Exit fullscreen",exact:true})).toBeVisible();
 await expect(page.getByLabel("Program diagram",{exact:true})).toHaveAttribute("data-expanded","true");
 const expanded=await page.getByLabel("Program diagram",{exact:true}).boundingBox();
 expect(expanded!.width).toBeGreaterThan(1300);
 await page.keyboard.press("Escape");
 await expect(page.getByLabel("Program diagram",{exact:true})).toHaveAttribute("data-expanded","false");
 await page.getByRole("button",{name:"Fullscreen diagram",exact:true}).click();
 await page.getByRole("button",{name:"Exit fullscreen",exact:true}).click();
 await expect(page.getByLabel("Program diagram",{exact:true})).toHaveAttribute("data-expanded","false");
});


test("diagram dimensions survive view, viewport and fullscreen changes", async ({ page }) => {
  const warnings: string[] = [];
  page.on("console", message => {
    if (message.text().includes("[React Flow]")) warnings.push(message.text());
  });
  await page.goto("/");
  const diagram = page.getByLabel("Program diagram", { exact: true });
  const checkDimensions = async () => {
    await expect(diagram.locator(".react-flow__node").first()).toBeVisible();
    await expect.poll(async () => diagram.locator(".react-flow").evaluate(element => ({ width: element.clientWidth > 0, height: element.clientHeight > 0 }))).toEqual({ width: true, height: true });
  };
  await checkDimensions();
  await page.getByRole("button", { name: "Hide code", exact: true }).click();
  await expect(diagram).toBeVisible();
  await page.getByRole("button", { name: "Show code", exact: true }).click();
  await checkDimensions();
  await page.setViewportSize({ width: 390, height: 844 });
  await checkDimensions();
  await page.getByRole("button", { name: "Fullscreen diagram", exact: true }).click();
  await expect(diagram).toHaveAttribute("data-expanded", "true");
  await checkDimensions();
  await page.getByRole("button", { name: "Exit fullscreen", exact: true }).click();
  await expect(diagram).toHaveAttribute("data-expanded", "false");
  await checkDimensions();
  await page.setViewportSize({ width: 1440, height: 1080 });
  await checkDimensions();
  expect(warnings).toEqual([]);
});


test("hides only code and restores it", async ({ page }) => {
  const warnings: string[] = [];
  page.on("console", message => { if(message.text().includes("[React Flow]")) warnings.push(message.text()); });
  await page.goto("/");
  const diagram=page.getByLabel("Program diagram",{exact:true});
  const code=page.getByLabel("Generated code for main.cpp");
  await expect(code).toBeVisible();
  const toggleX=(await page.getByRole("button",{name:"Hide code",exact:true}).boundingBox())!.x;
  const initial=(await diagram.boundingBox())!.height;
  await page.getByRole("button",{name:"Hide code",exact:true}).click();
  await expect(code).toBeHidden();
  await expect(page.getByText("Configuration validated.",{exact:false})).toBeVisible();
  expect((await page.getByRole("button",{name:"Show code",exact:true}).boundingBox())!.x).toBe(toggleX);
  await expect(page.getByRole("button",{name:"Show code",exact:true})).toBeInViewport();
  await expect(page.getByText("Select a block to edit · Drag to arrange",{exact:true})).toBeHidden();
  await expect.poll(async()=>(await diagram.boundingBox())!.height).toBeGreaterThan(initial);
  await expect(page.getByText("Valid configuration",{exact:false})).toBeVisible();
  await expect(page.getByRole("button",{name:"Code",exact:true})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Program visual",exact:true})).toHaveCount(0);
  await page.getByRole("button",{name:"Show code",exact:true}).click();
  await expect(code).toBeVisible();
  await expect.poll(async()=>(await diagram.boundingBox())!.height).toBe(initial);
  await page.setViewportSize({width:390,height:844});
  const mobile=(await diagram.boundingBox())!.height;
  await page.getByRole("button",{name:"Hide code",exact:true}).click();
  await expect.poll(async()=>(await diagram.boundingBox())!.height).toBeGreaterThan(mobile);
  await expect(page.getByRole("button",{name:"Show code",exact:true})).toBeInViewport();
  await page.getByRole("button",{name:"Show code",exact:true}).click();
  await expect(code).toBeVisible();
  expect(warnings).toEqual([]);
});

test("board selection, GPIO options, generation and persistence", async ({ page }) => {
 await page.goto("/");
 const board=page.getByRole("combobox",{name:"Board",exact:true});
 await expect(board.locator("option")).toHaveText(["ESP32 Denky32","ESP32-CAM AI-Thinker","TTGO T-Camera ESP32-WROVER-B","Seeed Studio XIAO ESP32-S3 Sense · OV3660","ESP32-C3 SuperMini","ESP32 D1 Mini / ESP32-S"]);
 for(const id of ["esp32cam","ttgo-t-camera","seeed_xiao_esp32s3","esp32-c3-supermini","wemos_d1_mini32"]){
  await board.selectOption(id);
  if(id==="ttgo-t-camera") await expect(page.getByRole("button",{name:"main.cpp",exact:true}).first()).toBeDisabled();
  else await expect(page.getByRole("button",{name:"main.cpp",exact:true}).first()).toBeEnabled();
 }
 await board.selectOption("esp32-c3-supermini");
 await page.getByRole("button",{name:"Board and pins",exact:true}).click();
 await page.getByText("Board specifications",{exact:true}).click();
 await expect(page.getByText("0–10, 20 and 21 (13 GPIOs); 3.3 V logic",{exact:true})).toBeVisible();
 await expect(page.getByText("Blue LED on GPIO8, active low · BOOT on GPIO9 · RESET on EN",{exact:true})).toBeVisible();
 await page.keyboard.press("Escape");
 await page.getByRole("button",{name:"3 Inputs and sensors",exact:true}).click();
 await page.getByRole("button",{name:"Analog position input · Potentiometer",exact:true}).click();
 const adc=page.getByRole("combobox",{name:"ADC1 signal",exact:true});
 await expect(adc.locator("option")).toHaveText(["GPIO 0","GPIO 1","GPIO 2","GPIO 3","GPIO 4"]);
 await expect(adc).toHaveValue("0");
 await page.getByRole("button",{name:/Communication$/}).click();
 await expect(page.getByRole("combobox",{name:"SDA",exact:true})).toHaveValue("8");
 await expect(page.getByRole("combobox",{name:"SCL",exact:true})).toHaveValue("9");
 await page.getByRole("button",{name:"USB / Serial",exact:true}).click();
 await expect(page.getByText("Use a 3.3 V USB–TTL adapter",{exact:false})).toBeVisible();
 await expect(page.getByLabel("Generated code for main.cpp")).toContainText("ros.beginSerial");
 await page.getByRole("button",{name:"platformio.ini",exact:true}).last().click();
 await expect(page.getByLabel("Generated code for platformio.ini")).toContainText("board = esp32-c3-devkitm-1");
 await expect(page.getByLabel("Generated code for platformio.ini")).not.toContainText("board_build.f_cpu");
 await expect(page.getByLabel("Generated code for platformio.ini")).not.toContainText("build_flags");
 await page.reload();
 await expect(board).toHaveValue("esp32-c3-supermini");
 await board.selectOption("seeed_xiao_esp32s3");
 await page.getByRole("button",{name:/Communication$/}).click();
 await expect(page.getByRole("combobox",{name:"SDA",exact:true})).toHaveValue("5");
 await expect(page.getByRole("combobox",{name:"SCL",exact:true})).toHaveValue("6");
 await expect(page.getByRole("button",{name:"main.cpp",exact:true}).first()).toBeDisabled();
 await page.getByRole("button",{name:"3 Inputs and sensors",exact:true}).click();
 await page.getByRole("button",{name:"/potentiometer",exact:false}).click();
 await page.getByRole("combobox",{name:"ADC1 signal",exact:true}).selectOption("1");
 await expect(page.getByRole("button",{name:"main.cpp",exact:true}).first()).toBeEnabled();
});


test("maximizes code over the diagram and restores it", async ({page})=>{
 await page.goto("/");
 const maximize=page.getByRole("button",{name:"Maximize code",exact:true});
 await maximize.click();
 const dialog=page.getByRole("dialog",{name:"Expanded code",exact:true});
 await expect(dialog).toBeVisible();
 const bounds=(await dialog.boundingBox())!;
 expect(bounds.width).toBeGreaterThan(1400);
 expect(bounds.height).toBeGreaterThan(1000);
 await expect(dialog.getByLabel("Generated code for main.cpp")).toContainText("counter_0 + 1");
 await dialog.getByRole("button",{name:"platformio.ini",exact:true}).click();
 await expect(dialog.getByLabel("Generated code for platformio.ini")).toContainText("board = denky32");
 const download=page.waitForEvent("download");
 await dialog.getByRole("button",{name:"Download",exact:true}).click();
 expect((await download).suggestedFilename()).toBe("platformio.ini");
 await page.keyboard.press("Escape");
 await expect(dialog).toBeHidden();
 await expect(page.getByLabel("Generated code for platformio.ini")).toBeVisible();
 await expect(maximize).toBeFocused();
 await maximize.click();
 await dialog.getByRole("button",{name:"Restore code panel size",exact:true}).click();
 await expect(dialog).toBeHidden();
 await page.setViewportSize({width:390,height:844});
 await maximize.click();
 await expect(dialog).toBeVisible();
 expect((await dialog.boundingBox())!.width).toBeLessThanOrEqual(390);
 await page.keyboard.press("Escape");
 await expect(page.getByLabel("Program diagram",{exact:true})).toBeVisible();
});


test("TTGO needs a valid external pin and XIAO identifies OV3660",async({page})=>{
 await page.goto("/");
 const board=page.getByRole("combobox",{name:"Board",exact:true});
 await board.selectOption("ttgo-t-camera");
 await expect(page.getByRole("button",{name:"main.cpp",exact:true}).first()).toBeDisabled();
 await page.locator('.react-flow__node[data-id="led"]').click();
 const pin=page.getByRole("combobox",{name:"Output GPIO",exact:true});
 await expect(pin.locator("option")).toHaveText(["GPIO 2 · unavailable","/led_builtin · unavailable","GPIO 21","GPIO 22"]);
 await pin.selectOption("21");
 await expect(page.getByRole("button",{name:"main.cpp",exact:true}).first()).toBeEnabled();
 await board.selectOption("seeed_xiao_esp32s3");
 await page.getByRole("button",{name:"Board and pins",exact:true}).click();
 await page.getByText("Board specifications",{exact:true}).click();
 await expect(page.getByText("Maximum resolution 2048×1536, fixed focus; no autofocus",{exact:true})).toBeVisible();
 await page.keyboard.press("Escape");
 await expect(pin.locator("option").last()).toHaveText("GPIO 21 /led_builtin");
 await board.selectOption("denky32");
 await expect(board).toHaveValue("denky32");
 await page.getByRole("button",{name:"platformio.ini",exact:true}).last().click();
 await expect(page.getByLabel("Generated code for platformio.ini")).toContainText("board = denky32");
});


test("board help: local image, pin details, dismissal and legacy draft",async({page})=>{
 await page.goto("/");
 const board=page.getByRole("combobox",{name:"Board",exact:true});
 await expect(board.locator("option")).toHaveCount(6);
 await expect(board.locator('option[value="esp32dev"]')).toHaveCount(0);
 const help=page.getByRole("button",{name:"Board and pins",exact:true});
 for(const id of ["denky32","esp32cam","ttgo-t-camera","seeed_xiao_esp32s3","esp32-c3-supermini","wemos_d1_mini32"]){
  await board.selectOption(id);await help.click();
  const dialog=page.getByRole("dialog",{name:/Board and pins/});
  await expect(dialog).toBeVisible();
  const image=dialog.locator("img");await expect(image).toBeVisible();
  await expect.poll(()=>image.evaluate(e=>e instanceof HTMLImageElement&&e.complete&&e.naturalWidth>0)).toBe(true);
  await expect(dialog.getByRole("table")).toBeVisible();
  await expect(dialog.getByRole("rowheader",{name:"GND",exact:true})).toBeVisible();
  await page.keyboard.press("Escape");await expect(dialog).toBeHidden();
  await expect(help).toBeFocused();
 }
 await page.setViewportSize({width:390,height:844});await help.click();
 const dialog=page.getByRole("dialog",{name:/Board and pins/});
 expect((await dialog.boundingBox())!.width).toBeLessThanOrEqual(390);
 await dialog.getByRole("button",{name:"Close board help",exact:true}).click();
 await page.evaluate(()=>{const key="microros-studio-v1";const saved=JSON.parse(localStorage.getItem(key)!);saved.board="esp32dev";saved.name="My previous draft";localStorage.setItem(key,JSON.stringify(saved));});
 await page.reload();await expect(board).toHaveValue("denky32");
 await expect(page.getByLabel("Project name",{exact:true})).toHaveValue("My previous draft");
});


test("new devices, board-specific touch, names, onboard LED and next steps",async({page})=>{
 await page.goto("/");
 const node=page.getByLabel("Node name",{exact:true});
 await expect(node).toHaveValue("micro_ros_node");
 await node.fill("temperature");await node.blur();await expect(node).toHaveValue("temperature_node");
 const board=page.getByRole("combobox",{name:"Board",exact:true});
 await board.selectOption("esp32-c3-supermini");
 await page.getByRole("button",{name:"2 Communication",exact:true}).click();
 await expect(page.getByLabel("Port",{exact:true})).toHaveValue("8888");
 await expect(page.getByLabel("Port",{exact:true})).not.toBeEditable();
 const help=page.getByRole("button",{name:"Board and pins",exact:true});await help.click();
 await expect(page.getByRole("dialog",{name:/Board and pins/})).toBeVisible();await page.keyboard.press("Escape");
 await page.getByRole("button",{name:"3 Inputs and sensors",exact:true}).click();
 await expect(page.getByRole("button",{name:"Capacitive touch input",exact:true})).toBeDisabled();
 await page.getByRole("button",{name:"Internal temperature sensor",exact:true}).click();
 await expect(page.getByLabel("Generated code for main.cpp")).toContainText("temperatureRead()");
 await page.getByRole("button",{name:"Analog temperature sensor · LM35",exact:true}).click();
 await expect(page.getByLabel("Generated code for main.cpp")).toContainText("analogReadMilliVolts");
 await page.getByRole("button",{name:/Project and node$/}).click();
 await board.selectOption("seeed_xiao_esp32s3");
 await page.getByRole("button",{name:"3 Inputs and sensors",exact:true}).click();
 await page.getByRole("button",{name:"Capacitive touch input",exact:true}).click();
 await expect(page.getByRole("combobox",{name:"Touch signal",exact:true}).locator("option")).toHaveText(Array.from({length:9},(_,i)=>`GPIO ${i+1}`));
 await page.getByLabel("ROS 2 topic",{exact:true}).fill("touch_sensor");
 await expect(page.getByLabel("ROS 2 topic",{exact:true})).toHaveValue("/touch_sensor");
 // Restore the valid initial project for the final navigation and built-in LED checks.
 page.once("dialog",dialog=>dialog.accept());await page.getByRole("button",{name:"Restore example",exact:true}).click();
 await page.getByRole("button",{name:"4 Outputs and actuators",exact:true}).click();
 for(const title of ["Passive buzzer · Frequency tones","I2C character LCD · 16×2","4-digit LED display · TM1637","Stepper motor + driver · 28BYJ-48 + ULN2003","LED matrix + driver · MAX7219"])await expect(page.getByRole("button",{name:title,exact:true})).toBeEnabled();
 await page.getByRole("button",{name:"Passive buzzer · Frequency tones",exact:true}).click();
 await expect(page.getByRole("combobox",{name:"Buzzer PWM signal",exact:true}).locator("option").filter({hasText:"/led_builtin"})).toHaveText("GPIO 2 /led_builtin");
 await page.getByRole("button",{name:"Delete entity",exact:true}).click();
 await page.getByRole("button",{name:"5 Review and generate",exact:true}).click();
 await page.getByRole("button",{name:"Next steps",exact:true}).click();
 const instructions=page.getByRole("dialog",{name:"Next steps",exact:true});
 await expect(instructions.getByRole("link",{name:/Download base project/})).toBeVisible();
 await expect(instructions).toContainText("--port 8888");
});


test("language toggle persists and keeps firmware unchanged", async ({page})=>{
 await page.goto("/");
 await expect(page.getByText("BETA 0.3",{exact:true})).toBeVisible();
 const original=await page.getByLabel("Generated code for main.cpp").locator(".code-text").allTextContents();
 await page.getByRole("button",{name:"Switch to Spanish"}).click();
 await expect(page.locator("html")).toHaveAttribute("lang","es");
 await expect(page.getByRole("heading",{name:"Construye tu nodo micro-ROS"})).toBeVisible();
 await expect(page.getByLabel("Nombre del proyecto")).toHaveValue("My first robot");
 expect(await page.getByLabel("Código generado para main.cpp").locator(".code-text").allTextContents()).toEqual(original);
 await page.getByRole("button",{name:"3 Entradas y sensores",exact:true}).click();
 await page.getByRole("button",{name:"Joystick analógico de 2 ejes",exact:true}).click();
 await page.getByRole("combobox",{name:"Botón",exact:true}).selectOption("-1");
 await expect(page.getByLabel("Código generado para main.cpp")).toContainText("msg_2.z = 0.0;");
 await expect(page.getByLabel("Estado de configuración")).toContainText("Configuración válida");
 await page.reload();
 await expect(page.getByRole("heading",{name:"Construye tu nodo micro-ROS"})).toBeVisible();
 await page.getByRole("button",{name:"Cambiar a inglés"}).click();
 await expect(page.getByRole("heading",{name:"Build your micro-ROS node"})).toBeVisible();
 await expect(page.getByRole("button",{name:"Publisher + timer",exact:true})).toBeVisible();
 await page.getByRole("button",{name:"3 Inputs and sensors",exact:true}).click();
 await page.getByRole("button",{name:/2-axis analog joystick.*joystick/}).click();
 await expect(page.getByRole("combobox",{name:"Button",exact:true})).toHaveValue("-1");
});

test("offers optional XSHUT and STBY and exports named pins",async({page})=>{
 await page.goto("/");
 await page.getByRole("button",{name:"3 Inputs and sensors",exact:true}).click();
 await page.getByRole("button",{name:"Infrared ToF distance sensor · VL53L0Xv2",exact:true}).click();
 await page.getByRole("combobox",{name:"XSHUT",exact:true}).selectOption("-1");
 await expect(page.getByLabel("Configuration status")).toContainText("Valid configuration");
 await page.getByRole("combobox",{name:"I2C address",exact:true}).selectOption("48");
 await expect(page.getByRole("button",{name:"main.cpp",exact:true}).first()).toBeDisabled();
 await page.getByRole("combobox",{name:"I2C address",exact:true}).selectOption("41");
 await page.getByRole("button",{name:"4 Outputs and actuators",exact:true}).click();
 await page.getByRole("button",{name:"Dual H-bridge motor driver · TB6612FNG",exact:true}).click();
 await page.getByRole("combobox",{name:"STBY",exact:true}).selectOption("-1");
 await expect(page.getByLabel("Configuration status")).toContainText("Valid configuration");
 await expect(page.getByLabel("Generated code for main.cpp")).toContainText("const uint8_t led1 = 2;");
 await expect(page.getByLabel("Generated code for main.cpp")).toContainText("pinMode(led1, OUTPUT)");
});


test("passive buzzer catalog, bilingual help and retired active draft",async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem("microros-studio-v1",JSON.stringify({version:1,name:"Saved robot",nodeName:"saved_node",board:"denky32",domain:13,transport:"wifi",ssid:"YOUR_WIFI_SSID",password:"",agentIp:"192.168.1.100",port:8888,entities:[{id:"counter",kind:"publisher",topic:"/counter",message:"Int32",behavior:"counter",period:1000,value:0},{id:"old",kind:"device",device:"active-buzzer",topic:"/buzzer",pins:{signal:4},period:100,activeLow:false,timeout:500}]}));
 });
 await page.goto("/");
 await expect(page.getByLabel("Project name")).toHaveValue("Saved robot");
 await expect(page.getByText(/The active buzzer was removed from the draft/)).toBeVisible();
 await page.getByRole("button",{name:"4 Outputs and actuators",exact:true}).click();
 await expect(page.getByRole("button",{name:"Active buzzer",exact:true})).toHaveCount(0);
 await page.getByRole("button",{name:"Passive buzzer · Frequency tones",exact:true}).click();
 await expect(page.getByLabel("ROS 2 topic")).toHaveValue("/buzzer_frequency");
 await expect(page.getByLabel("Message type")).toHaveValue("std_msgs / Int32");
 await expect(page.getByRole("combobox",{name:"Polarity",exact:true})).toHaveCount(0);
 await expect(page.getByLabel("Generated code for main.cpp")).toContainText("ledcWriteTone(2,");
 await page.getByRole("button",{name:"Switch to Spanish"}).click();
 await expect(page.getByRole("button",{name:"Buzzer pasivo · Tonos por frecuencia",exact:true})).toBeVisible();
 await expect(page.getByText(/Comando de frecuencia en Hz/)).toBeVisible();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("microros-studio-v1")!));
 expect(saved.entities.some((e:{device?:string})=>e.device==="active-buzzer")).toBe(false);
 expect(saved.entities.some((e:{device?:string})=>e.device==="passive-buzzer")).toBe(true);
});


test("responsive editor reflows under browser zoom without footer or column gaps",async({page})=>{
 test.setTimeout(90000);
 const errors:string[]=[];
 page.on("pageerror",e=>errors.push(e.message));
 page.on("console",m=>{if(m.text().includes("[React Flow]"))errors.push(m.text());});
 await page.goto("/");
 await expect(page.getByRole("heading",{name:"Build your micro-ROS node"})).toBeVisible();
 // CSS viewport equivalents of page zoom on a 1920×1080 display, plus small phones.
 const sizes=[{width:2400,height:1350},{width:2133,height:1200},{width:1920,height:1080},{width:1536,height:864},{width:1280,height:720},{width:1097,height:617},{width:960,height:540},{width:768,height:432},{width:480,height:640},{width:390,height:844},{width:320,height:568}];
 for(const size of sizes){
  await page.setViewportSize(size);
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),{message:`Horizontal overflow at ${size.width}px`}).toBe(true);
  await expect.poll(()=>page.locator(".studio-grid").evaluate(grid=>{
   const row=grid.getBoundingClientRect();
   const children=Array.from(grid.children).map(child=>child.getBoundingClientRect());
   if(getComputedStyle(grid).display==="grid")return children.every(bounds=>Math.abs(bounds.bottom-row.bottom)<2);
   return children.every((bounds,i)=>i===0||bounds.top>=children[i-1].bottom-1);
  }),{message:`Panel alignment at ${size.width}px`}).toBe(true);
  await expect.poll(()=>page.locator(".configuration-status").evaluate(e=>e.getBoundingClientRect().height)).toBeLessThan(240);
  await expect.poll(()=>page.getByLabel("Program diagram",{exact:true}).evaluate(diagram=>{
   const pane=diagram.getBoundingClientRect(),node=diagram.querySelector(".react-flow__node")?.getBoundingClientRect();
   return !!node&&node.width>0&&node.left>=pane.left-2&&node.right<=pane.right+2&&node.top>=pane.top-2&&node.bottom<=pane.bottom+2;
  }),{message:`Diagram resize at ${size.width}px`}).toBe(true);
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  await expect.poll(()=>page.locator("footer").evaluate(footer=>{
   const bounds=footer.getBoundingClientRect(),grid=document.querySelector(".studio-grid")!.getBoundingClientRect();
   return bounds.top>=grid.bottom-1&&bounds.left>=-1&&bounds.right<=innerWidth+1&&bounds.bottom<=innerHeight+1;
  }),{message:`Footer positioning at ${size.width}px`}).toBe(true);
 }
 await page.screenshot({path:"test-results/responsive-320.png",fullPage:true});
 await page.setViewportSize({width:1280,height:720});
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:"test-results/responsive-zoom-150.png",fullPage:true});
 expect(errors).toEqual([]);
});

test("responsive Spanish controls, long node names and expanded code stay accessible",async({page})=>{
 test.setTimeout(60000);
 await page.goto("/");
 await page.getByRole("combobox",{name:"Board",exact:true}).selectOption("seeed_xiao_esp32s3");
 await page.getByLabel("Node name",{exact:true}).fill("long_sensor_".repeat(15)+"node");
 await page.getByRole("button",{name:"Switch to Spanish"}).click();
 await page.setViewportSize({width:320,height:568});
 await page.getByRole("button",{name:"4 Salidas y actuadores",exact:true}).click();
 await page.getByRole("button",{name:"Buzzer pasivo · Tonos por frecuencia",exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const wizard=page.getByRole("complementary",{name:"Asistente de aplicaciones micro-ROS"});
 await wizard.getByRole("button",{name:"Siguiente",exact:true}).click();
 await expect(wizard.getByRole("button",{name:"Siguiente paso",exact:true})).toBeEnabled();
 await page.getByRole("button",{name:"Ocultar código",exact:true}).click();
 await expect(page.getByLabel("Código generado para main.cpp")).toBeHidden();
 await page.getByRole("button",{name:"Mostrar código",exact:true}).click();
 await page.getByRole("button",{name:"Maximizar código",exact:true}).click();
 const dialog=page.getByRole("dialog",{name:"Código ampliado",exact:true});
 await expect(dialog).toBeVisible();
 await expect.poll(()=>dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
 const download=dialog.getByRole("button",{name:"Descargar",exact:true});
 await expect(download).toBeInViewport();
 await expect(dialog.getByRole("button",{name:"Restaurar tamaño del panel de código",exact:true})).toBeInViewport();
 await page.screenshot({path:"test-results/responsive-code-320-es.png"});
 await page.keyboard.press("Escape");
 await expect(dialog).toBeHidden();
 await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
 await expect(page.locator("footer")).toBeInViewport();
});
