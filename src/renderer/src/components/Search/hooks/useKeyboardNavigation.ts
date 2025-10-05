import { nextTick } from "vue";
import type { AppItem } from "@shared/typings";

export function useKeyboardNavigation(
  flatItems: any,
  searchCategories: any,
  selectedIndex: any,
  executeItem: (app: AppItem) => void,
  handleSearch: (value: string) => Promise<void>,
  handleEscAction: () => Promise<void>
) {
  // 滚动到选中的项目
  const scrollToSelectedItem = () => {
    nextTick(() => {
      // AppItem组件会监听isSelected变化并自动滚动
    });
  };

  // 智能键盘导航处理
  const handleKeyNavigation = (event: KeyboardEvent) => {
    if (flatItems.value.length === 0) return;

    // 根据响应式设计，动态计算每行项目数
    const getItemsPerRow = () => {
      const container = document.getElementById("content-scroll-container");
      if (!container) return 8;

      const containerWidth = container.clientWidth;
      if (containerWidth < 640) return 6;
      if (containerWidth < 768) return 7;
      if (containerWidth < 1024) return 8;
      return 9;
    };

    const itemsPerRow = getItemsPerRow();
    const currentItem = flatItems.value[selectedIndex.value];
    if (!currentItem) return;

    const currentCategory = searchCategories.value.find(
      (cat: any) => cat.id === currentItem.categoryId
    );
    if (!currentCategory) return;

    const categoryStartIndex = flatItems.value.findIndex(
      (item: any) => item.categoryId === currentItem.categoryId
    );
    const categoryItemIndex = selectedIndex.value - categoryStartIndex;
    const categoryRow = Math.floor(categoryItemIndex / itemsPerRow);
    const categoryCol = categoryItemIndex % itemsPerRow;
    const categoryTotalRows = Math.ceil(currentCategory.items.length / itemsPerRow);

    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        if (categoryRow > 0) {
          const newIndex =
            categoryStartIndex + (categoryRow - 1) * itemsPerRow + categoryCol;
          if (newIndex >= 0 && newIndex < flatItems.value.length) {
            selectedIndex.value = newIndex;
            scrollToSelectedItem();
          }
        } else {
          const currentCategoryIndex = searchCategories.value.findIndex(
            (cat: any) => cat.id === currentItem.categoryId
          );
          if (currentCategoryIndex > 0) {
            const prevCategory = searchCategories.value[currentCategoryIndex - 1];
            const prevCategoryStartIndex = flatItems.value.findIndex(
              (item: any) => item.categoryId === prevCategory.id
            );
            if (prevCategoryStartIndex >= 0) {
              const targetIndex =
                prevCategoryStartIndex +
                Math.min(
                  categoryCol,
                  Math.floor(prevCategory.items.length / itemsPerRow) * itemsPerRow +
                  (prevCategory.items.length % itemsPerRow) -
                  1
                );
              if (targetIndex < flatItems.value.length) {
                selectedIndex.value = targetIndex;
                scrollToSelectedItem();
              }
            }
          }
        }
        break;

      case "ArrowDown":
        event.preventDefault();
        if (categoryRow < categoryTotalRows - 1) {
          const newIndex =
            categoryStartIndex + (categoryRow + 1) * itemsPerRow + categoryCol;
          if (newIndex < flatItems.value.length) {
            selectedIndex.value = newIndex;
            scrollToSelectedItem();
          }
        } else {
          const currentCategoryIndex = searchCategories.value.findIndex(
            (cat: any) => cat.id === currentItem.categoryId
          );
          if (currentCategoryIndex < searchCategories.value.length - 1) {
            const nextCategory = searchCategories.value[currentCategoryIndex + 1];
            const nextCategoryStartIndex = flatItems.value.findIndex(
              (item: any) => item.categoryId === nextCategory.id
            );
            if (nextCategoryStartIndex >= 0) {
              const targetIndex =
                nextCategoryStartIndex + Math.min(categoryCol, itemsPerRow - 1);
              if (targetIndex < flatItems.value.length) {
                selectedIndex.value = targetIndex;
                scrollToSelectedItem();
              }
            }
          }
        }
        break;

      case "ArrowLeft":
        event.preventDefault();
        if (categoryCol > 0) {
          selectedIndex.value = selectedIndex.value - 1;
        } else if (categoryRow > 0) {
          const newIndex =
            categoryStartIndex + (categoryRow - 1) * itemsPerRow + (itemsPerRow - 1);
          if (newIndex >= 0) {
            selectedIndex.value = newIndex;
          }
        }
        scrollToSelectedItem();
        break;

      case "ArrowRight":
        event.preventDefault();
        const categoryItemsInRow = Math.min(
          itemsPerRow,
          currentCategory.items.length - categoryRow * itemsPerRow
        );
        if (categoryCol < categoryItemsInRow - 1) {
          selectedIndex.value = selectedIndex.value + 1;
        } else if (categoryRow < categoryTotalRows - 1) {
          const newIndex = categoryStartIndex + (categoryRow + 1) * itemsPerRow;
          if (newIndex < flatItems.value.length) {
            selectedIndex.value = newIndex;
          }
        }
        scrollToSelectedItem();
        break;

      case "Enter":
        event.preventDefault();
        if (flatItems.value[selectedIndex.value]) {
          executeItem(flatItems.value[selectedIndex.value]);
        }
        break;

      case "Escape":
        event.preventDefault();
        handleEscAction();
        break;
    }
  };

  return {
    handleKeyNavigation,
    scrollToSelectedItem,
  };
}
