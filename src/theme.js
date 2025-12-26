//
export const getLightTheme = (customTextColor) => ({
  bg: "#f8f9fa",
  text: customTextColor || "#222", // 커스텀 색상이 없으면 기본값 #222
  card: "#ffffff",
  headerBg: "#1976d2",
  headerText: "#ffffff",
  border: "#ddd",
  activeText: "#1976d2",
  activeBg: "#e3f2fd"
});

export const getDarkTheme = (customTextColor) => ({
  bg: "#121212",
  text: customTextColor || "#e5e5e5", // 커스텀 색상이 없으면 기본값 #e5e5e5
  card: "#1e1e1e",
  headerBg: "#333",
  headerText: "#fff",
  border: "#444",
  activeText: "#ffffff",
  activeBg: "#333"
});
// export const lightTheme = {
//   bg: "#f8f9fa",
//   text: "#222",
//   card: "#ffffff",
//   headerBg: "#1976d2",
//   headerText: "#ffffff",
//   border: "#ddd",
//   activeText: "#1976d2"  
// };

// export const darkTheme = {
//   bg: "#121212",
//   text: "#e5e5e5",
//   card: "#1e1e1e",
//   headerBg: "#333",
//   headerText: "#fff",
//   border: "#444",
//   activeText: "#ffffff" 
// };
