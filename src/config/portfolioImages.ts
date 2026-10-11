/**
 * Central image configuration.
 *
 * Photographs are added AFTER the initial build:
 *  1. Drop the files into `public/images/`
 *  2. Update the paths below (e.g. "/images/hero.jpg")
 *
 * Empty strings render styled, responsive placeholders — never broken images.
 */
export const portfolioImages: Record<'hero' | 'about' | 'creative' | 'objective', string> = {
  hero: '/images/hero.jpg',
  about: '/images/about.jpg',
  creative: '/images/creative.jpg',
  objective: '/images/objective.jpg',
}

export const portfolioVideos: Record<'creative', string> = {
  creative: '/images/creative_rain_reduced.mp4',
}

export default portfolioImages
