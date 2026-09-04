export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  return $fetch("/folders", {
    baseURL: config.nodusApiBase,
  });
});
