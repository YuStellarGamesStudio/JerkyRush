import { Game, Scene, Sprite, Texture } from 'xyz.js';
import { catPalettes, drawArena, drawCat, drawItem, drawOrangeCat } from './art';
import { config } from './config';
import type { Cat } from './game/cats';
import type { ItemKind } from './game/spawner';
import type { Round } from './game/state';

/** 紋理以兩倍解析度繪製再縮小顯示，讓高 DPI 螢幕上的線條保持清晰。 */
const RESOLUTION = 2;
const SPRITE_SCALE: [number, number] = [1 / RESOLUTION, 1 / RESOLUTION];
const ITEM_KINDS: readonly ItemKind[] = ['small', 'orange-small', 'big', 'can', 'chili'];

async function createTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const source = document.createElement('canvas');
  source.width = Math.ceil(width * RESOLUTION);
  source.height = Math.ceil(height * RESOLUTION);
  const context = source.getContext('2d');
  if (!context) throw new Error('無法建立 2D 繪圖環境。');
  context.scale(RESOLUTION, RESOLUTION);
  draw(context);
  return Texture.fromImage(source);
}

/** 受擊無敵期間閃爍。 */
function catOpacity(cat: Cat, elapsed: number): number {
  return elapsed < cat.invulnUntil && Math.floor(elapsed * 12) % 2 === 0 ? 0.3 : 1;
}

/** 越過終點再落回的「跳出來」曲線（easeOutBack）。 */
function jump(t: number): number {
  const overshoot = 1.70158;
  return 1 + (overshoot + 1) * (t - 1) ** 3 + overshoot * (t - 1) ** 2;
}

export interface EngineView {
  /** 切換語言時重畫橘貓對話框文字。 */
  setMeowText(text: string): Promise<void>;
}

/**
 * 啟動 XYZ.js（Canvas2D 路徑）並每帧呼叫 advance 推進遊戲，再把 round 的狀態同步到畫面。
 * 遊戲核心只透過這個函式接觸引擎。
 */
export async function startEngine(
  canvas: HTMLCanvasElement,
  round: Round,
  advance: (dt: number) => void,
  meowText: string,
): Promise<EngineView> {
  const { width, height } = config.arena;
  const game = await Game.create({ canvas, renderer: 'canvas2d', width, height, autoResize: false });
  const textures: Texture[] = [];
  const track = (texture: Texture): Texture => {
    textures.push(texture);
    return texture;
  };
  const orangeHeight = config.orangeCat.size;
  const orangeWidth = orangeHeight * 1.5;
  const createOrangeTexture = (text: string) =>
    createTexture(orangeWidth, orangeHeight, (ctx) => drawOrangeCat(ctx, orangeWidth, orangeHeight, text));
  let orangeTexture: Texture | undefined;
  const dispose = (): void => {
    game.destroy();
    for (const texture of textures) texture.destroy();
    orangeTexture?.destroy();
  };
  try {
    const arena = track(await createTexture(width, height, (ctx) => drawArena(ctx, width, height)));
    const catTexture = async (cat: Cat, palette: keyof typeof catPalettes) => {
      const size = cat.radius * 2;
      return track(await createTexture(size, size, (ctx) => drawCat(ctx, size, catPalettes[palette])));
    };
    const blackTexture = await catTexture(round.black, 'black');
    const grayTexture = await catTexture(round.gray, 'gray');
    const itemTextures = {} as Record<ItemKind, Texture>;
    for (const kind of ITEM_KINDS) {
      const size = config.items.radius[kind] * 2.5;
      itemTextures[kind] = track(await createTexture(size, size, (ctx) => drawItem(ctx, size, kind)));
    }
    const initialOrange = await createOrangeTexture(meowText);
    orangeTexture = initialOrange;

    const sprite = (texture: Texture, zIndex: number): Sprite =>
      new Sprite({ texture, zIndex, scale: SPRITE_SCALE, position: [width / 2, height / 2] });

    class ArenaScene extends Scene {
      readonly itemSprites = Array.from({ length: config.items.maxOnField },
        () => this.add(sprite(itemTextures.small, 1)));
      readonly graySprite = this.add(sprite(grayTexture, 2));
      readonly blackSprite = this.add(sprite(blackTexture, 3));
      readonly orangeSprite = this.add(sprite(initialOrange, 4));

      constructor() {
        super();
        this.add(sprite(arena, 0));
        this.sync();
      }

      override update(dt: number): void {
        advance(dt);
        this.sync();
      }

      private sync(): void {
        const { elapsed } = round;
        this.itemSprites.forEach((itemSprite, index) => {
          const item = round.items[index];
          itemSprite.visible = item !== undefined;
          if (!item) return;
          const texture = itemTextures[item.kind];
          if (itemSprite.texture !== texture) itemSprite.texture = texture;
          itemSprite.position.set(item.pos.x, item.pos.y);
          const remaining = item.spawnTime + item.ttl - elapsed;
          itemSprite.opacity = remaining < config.items.blinkSeconds && Math.floor(remaining * 6) % 2 === 0 ? 0.35 : 1;
        });

        for (const [catSprite, cat] of [[this.blackSprite, round.black], [this.graySprite, round.gray]] as const) {
          catSprite.position.set(cat.pos.x, cat.pos.y);
          catSprite.opacity = catOpacity(cat, elapsed);
        }

        const orange = round.orangeCat;
        this.orangeSprite.visible = orange.state !== 'idle';
        if (orange.state !== 'idle') {
          const x = Math.max(orangeWidth / 2, Math.min(width - orangeWidth / 2, orange.x));
          this.orangeSprite.position.set(x, height + orangeHeight / 2 - jump(orange.shown) * (orangeHeight + 4));
        }
      }
    }

    game.addEventListener('error', (event) => console.error((event as CustomEvent<Error>).detail));
    const scene = new ArenaScene();
    await game.setScene(scene);
    game.start();
    window.addEventListener('pagehide', (event) => {
      if (!event.persisted) dispose();
    });
    return {
      async setMeowText(text) {
        const next = await createOrangeTexture(text);
        const previous = orangeTexture;
        orangeTexture = next;
        scene.orangeSprite.texture = next;
        previous?.destroy();
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
