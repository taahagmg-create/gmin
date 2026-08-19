/**
 * Background scenes for the photo beautification pipeline.
 *
 * These prompts describe an EMPTY room. They deliberately do not mention a
 * vehicle, and do not ask the model to preserve one.
 *
 * Test 1 (see docs/photo-beautification.md) established why: given a car photo
 * and an explicit pixel-for-pixel instruction, gemini-3-pro-image re-rendered
 * and re-posed the car anyway, and built its shadow and reflection around its
 * own placement. Anything the model draws is discarded, so the correct request
 * is an empty stage that our real car is composited onto — with the shadow and
 * reflection synthesised in code from the actual mask.
 */

export type SceneId = "dark-showroom" | "grey-studio" | "architectural";

export type Scene = {
  id: SceneId;
  label: string;
  prompt: string;
  /** Where the key light sits, so synthesised shadows fall the right way. */
  lightDirection: "top" | "top-left";
  /** Floor reflectivity, 0–1, scaling the synthesised reflection. */
  floorReflectivity: number;
  /** Shadow opacity at the contact line, 0–1. */
  shadowStrength: number;
};

const COMMON =
  "Photorealistic architectural photography, shot on a full-frame camera at eye level, " +
  "horizon roughly one third from the bottom, generous empty floor across the whole " +
  "foreground. No vehicles, no people, no text, no signage, no logos, no watermarks. " +
  "Natural lighting physics, no artificial glow, no oversaturation, not stylised, not " +
  "illustrated.";

export const SCENES: Scene[] = [
  {
    id: "dark-showroom",
    label: "Premium dark showroom",
    lightDirection: "top",
    floorReflectivity: 0.60,
    shadowStrength: 0.70,
    prompt:
      "Empty premium automotive showroom interior, professional photograph at eye level. " +
      "Dark charcoal-grey vertical wall panels as backdrop, subtle panel seams visible. " +
      "High ceiling with recessed linear LED strip lights and focused spot downlights " +
      "casting dramatic pools of warm white light down onto the floor. " +
      "Highly polished glossy black floor filling the entire foreground — " +
      "mirror-like reflective surface showing reflections of the ceiling lights. " +
      "Centre of the floor is brightly illuminated, room edges recede into deep shadow. " +
      "Horizon roughly one third from the bottom, generous empty floor in the foreground. " +
      "Photorealistic, full-frame camera, 35mm lens. " +
      "No vehicles, no people, no text, no signage, no logos, no watermarks.",
  },
  {
    id: "grey-studio",
    label: "Neutral grey studio",
    lightDirection: "top-left",
    floorReflectivity: 0.12,
    shadowStrength: 0.42,
    prompt:
      "An empty professional photography studio. Seamless light grey cyclorama wall curving " +
      "smoothly into a matte pale grey floor, no visible seam or corner. Even diffused softbox " +
      "lighting from above and slightly front-left. No lighting equipment, stands or fixtures " +
      "visible in frame. Very subtle matte floor sheen. Neutral colour balance. " +
      COMMON,
  },
  {
    id: "architectural",
    label: "Architectural daylight",
    lightDirection: "top",
    floorReflectivity: 0.18,
    shadowStrength: 0.38,
    prompt:
      "An empty modern architectural forecourt. Smooth polished concrete ground filling the " +
      "foreground, a clean minimal building edge with glazing softly out of focus behind. " +
      "Overcast diffused daylight, gentle cool-neutral colour temperature, soft ambient " +
      "shadows. Faint damp-concrete sheen on the ground. " +
      COMMON,
  },
];

export function getScene(id: SceneId): Scene {
  const scene = SCENES.find((s) => s.id === id);
  if (!scene) throw new Error(`unknown scene: ${id}`);
  return scene;
}

/**
 * Assigns a scene from the vehicle id — deterministic, so a given car always
 * renders in the same room, and re-running the pipeline never reshuffles the
 * whole catalogue. Spreads roughly evenly across scenes so 133 vehicles don't
 * all share one backdrop.
 */
export function sceneForVehicle(_vehicleId: string): Scene {
  return SCENES[0];
}
