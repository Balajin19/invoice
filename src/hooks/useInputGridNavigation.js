import { useRef } from "react";

export function useInputGridNavigation(selectableColumn) {
  const inputRefs = useRef({});

  const shouldSelectColumn = (col) => {
    if (Array.isArray(selectableColumn)) {
      return selectableColumn.includes(col);
    }

    return col === selectableColumn;
  };

  const setRef = (row, col, el) => {
    if (!inputRefs.current[row]) inputRefs.current[row] = {};
    inputRefs.current[row][col] = el;
  };

  const focusCell = (row, col) => {
    const el = inputRefs.current?.[row]?.[col];

    if (!el) return;

    el.focus();

    if (shouldSelectColumn(col)) {
      el.select();
    }
  };
  
  const handleSequentialNavigation = (event, rowIndex, col, nextColumnMap) => {
    if (event.key !== "Tab" && event.key !== "Enter") return;

    const nextTarget = nextColumnMap[col];

    if (!nextTarget) return;

    const targetRow = rowIndex + (nextTarget.rowOffset || 0);
    const targetEl = inputRefs.current?.[targetRow]?.[nextTarget.col];

    if (!targetEl || targetEl.disabled) return;

    event.preventDefault();
    focusCell(targetRow, nextTarget.col);
  };
  
  const handleVerticalNavigation = (event, rowIndex, col) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusCell(rowIndex + 1, col);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusCell(rowIndex - 1, col);
    }
  };

  return {
    setRef,
    focusCell,
    handleSequentialNavigation,
    handleVerticalNavigation,
  };
}