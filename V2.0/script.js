"use strict";

(function () {
  /*==============================================
    전역 변수 및 누락 함수 정의
  ==============================================*/
  // 고유 식별자 생성 함수
  function generateUniqueId() {
    return "id-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
  }

  // 내보내기 전 데이터 유효성 검증 (필요에 따라 세부 로직 추가)
  function validateBeforeExport() {
    // 예: 필수 입력값 검증 등
    return true;
  }

  // 저장된 항목 관리 (중복 저장 방지용)
  const savedEntries = new Set();
  // 출전정보 등의 데이터 저장 (필요에 따라 실제 데이터 할당)
  const sourceData = {};

  /*==============================================
    상수 정의 (하드코딩 값 분리)
  ==============================================*/
  const DICTIONARIES = ["漢韓大辭典", "漢語大詞典", "大漢和辭典", "中文大辭典"];
  const TAGS = [
    "nation",
    "person",
    "place",
    "era",
    "book",
    "position",
    "term",
    "canon",
    "object",
    "building",
    "family",
  ];
  const ATTRIBUTES = [
    "국가",
    "인명",
    "지명",
    "연호",
    "서명",
    "관직",
    "용어",
    "경전",
    "물명",
    "건물",
    "가문",
  ];

  /*==============================================
    데이터 및 유틸리티 함수
  ==============================================*/
  let entryData = [];
  let modifiedTags = {}; // 사용자가 변경한 태깅 저장
  let entryCounter = 1; // 자동 증가 ID

  // HTML 특수문자 이스케이프 (보안 및 표시 용)
  function escapeHtml(text) {
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /*==============================================
    초기화 및 이벤트 등록
  ==============================================*/
  document.addEventListener("DOMContentLoaded", () => {
    populateAttributes();
    initThemeToggle(); // ✅ 다크 모드 초기화 복구
    initDictionaryList();

    const documentNameSelect = document.getElementById("documentName");
    if (documentNameSelect) {
      documentNameSelect.value = "論語注疏"; // ✅ 기본값 설정
    }

    document
      .getElementById("exportExcelPreviewBtn")
      .addEventListener("click", exportToExcelArrayPreview);
  });

  /*==============================================
    테마(다크모드) 토글 기능 (접근성 개선 포함)
  ==============================================*/
  function initThemeToggle() {
    const toggleButton = document.getElementById("theme-toggle");
    if (!toggleButton) return;
    // ARIA 레이블 추가
    toggleButton.setAttribute("aria-label", "Toggle dark mode");

    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
      document.body.classList.add("dark-mode");
      toggleButton.textContent = "☀️ 라이트 모드";
    } else {
      toggleButton.textContent = "🌙 다크 모드";
    }

    toggleButton.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      if (document.body.classList.contains("dark-mode")) {
        localStorage.setItem("theme", "dark");
        toggleButton.textContent = "☀️ 라이트 모드";
      } else {
        localStorage.setItem("theme", "light");
        toggleButton.textContent = "🌙 다크 모드";
      }
    });
  }

  /*==============================================
    속성 목록 동적 생성
  ==============================================*/
  function populateAttributes() {
    const attrSelect = document.getElementById("entryAttribute");
    attrSelect.innerHTML = ""; // 기존 옵션 초기화
    ATTRIBUTES.forEach((attr) => {
      const option = document.createElement("option");
      option.value = attr;
      option.textContent = attr;
      attrSelect.appendChild(option);
    });
  }

  /*==============================================
    항목 선택 및 태깅 업데이트
  ==============================================*/

  function populateDatalist() {
    const datalist = document.getElementById("attributeList");
    datalist.innerHTML = ""; // 기존 옵션 초기화

    ATTRIBUTES.forEach((attribute) => {
      const option = document.createElement("option");
      option.value = attribute;
      datalist.appendChild(option);
    });
  }

  function selectEntry(entry) {
    document.getElementById("entryId").value = entry.id;
    document.getElementById("entryName").value = entry.name;
    const attributeInput = document.getElementById("entryAttribute");

    // 기존 데이터 반영 (수정된 값이 있으면 우선 적용)
    attributeInput.value = modifiedTags[entry.id] || entry.attribute;
  }

  function updateTagging() {
    const entryId = document.getElementById("entryId").value;
    const newTag = document.getElementById("entryAttribute").value;
    modifiedTags[entryId] = newTag;
  }

  // 페이지 로드 시 datalist 채우기
  document.addEventListener("DOMContentLoaded", populateDatalist);

  // 입력값이 변경될 때마다 반영
  document
    .getElementById("entryAttribute")
    .addEventListener("input", updateTagging);

  /*==============================================
    엑셀(xlsx) 업로드 및 번역용례 데이터 처리
  ==============================================*/
  let exampleData = {};
  // 번역용례 데이터를 로드하는 함수
  function loadExamples() {
    const fileInput = document.getElementById("xlsxUploadExamples");
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const workbook = XLSX.read(e.target.result, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defaultValue: "" });
        exampleData = {};
        jsonData.forEach((row) => {
          if (row["용례식별자"]) {
            const key = row["용례식별자"].trim();
            if (key) {
              exampleData[key] = parseRow(row);
            }
          }
        });
        alert("번역용례 데이터 로드 완료!");
      } catch (error) {
        console.error("데이터 로드 중 오류 발생:", error);
        alert("데이터 로드 중 오류가 발생했습니다.");
      }
    };
    reader.onerror = function () {
      console.error("엑셀 파일 읽기 오류:", reader.error);
      alert("엑셀 파일 읽는 중 오류가 발생했습니다.");
    };
    reader.readAsArrayBuffer(file);
  }

  function parseRow(row) {
    const linkValue = extractLink(row["링크"]);
    return {
      원문: row["원문"]?.trim() || "(원문 없음)",
      번역문: row["번역문"]?.trim() || "(번역문 없음)",
      링크: linkValue || "(링크 없음)",
      출전정보식별자: row["출전정보식별자"]?.trim() || "(출전정보 식별자 없음)",
      출전정보: row["출전정보"]?.trim() || "(출전정보 없음)",
    };
  }

  function extractLink(link) {
    if (typeof link === "object" && link !== null) {
      return link.l ? link.l.Target : link.Target;
    } else if (typeof link === "string") {
      return link.trim() || null;
    }
    return null;
  }

  /*==============================================
    태그 스타일 적용 (예: <nation> → <code class="tag-nation">)
  ==============================================*/
  function applyTagStyles(text) {
    TAGS.forEach((tag) => {
      const regex = new RegExp(`<${tag}>(.*?)<\/${tag}>`, "g");
      text = text.replace(regex, `<span class="tag tag-${tag}">$1</span>`);
    });
    return text;
  }

  /*==============================================
    번역용례 데이터 가져오기 및 링크 열기
  ==============================================*/
  function fetchExample(index) {
    const inputElement = document.getElementById(`identifier${index}`);
    const id = inputElement.value.trim();

    if (exampleData.hasOwnProperty(id)) {
      const example = exampleData[id];

      document.getElementById(`originalText${index}`).value = example["원문"];
      document.getElementById(`translatedText${index}`).value =
        example["번역문"];
      document.getElementById(`chapterNo${index}`).value =
        example["출전정보식별자"];
      document.getElementById(`chapter${index}`).value = example["출전정보"];

      let link = example["링크"] ? example["링크"].trim() : "";

      // URL이 아닌 경우 자동 변환
      if (!/^https?:\/\//.test(link) && link) {
        link = `https://db.cyberseodang.or.kr/front/usecase/search.do?word=${encodeURIComponent(
          link
        )}`;
      }

      if (link) {
        const openLink = confirm(
          "관련 문서를 Microsoft Edge의 반대쪽 분할 화면에서 열겠습니까?"
        );

        if (openLink) {
          let newWindow = null;

          // Edge에서 실행 중인지 확인
          if (navigator.userAgent.includes("Edg")) {
            // Edge 분할 화면을 사용 중이라면 반대쪽 탭에서 열기
            newWindow = window.open(link, "opposite");
          }

          // Edge가 아니거나, 분할 화면이 아닌 경우 새 탭에서 열기
          if (!newWindow || newWindow.closed) {
            newWindow = window.open(link, "_blank");
          }

          // 팝업 차단 감지
          if (!newWindow || newWindow.closed) {
            alert(
              "팝업 차단으로 인해 새 창을 열 수 없습니다. 직접 링크를 클릭해 주세요."
            );
          }
        }
      } else {
        alert("유효한 하이퍼링크가 없습니다.");
      }
    } else {
      alert("해당 식별자의 데이터가 없습니다.");
    }
  }

  /*==============================================
    텍스트 영역에서 선택한 텍스트에 [= ...] 괄호 적용
  ==============================================*/
  function applyBrackets() {
    const selection = window.getSelection().toString().trim();
    if (selection) {
      const activeElement = document.activeElement;
      if (activeElement && activeElement.tagName === "TEXTAREA") {
        const textarea = activeElement;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        if (!text.includes(`[=${selection}]`)) {
          textarea.value =
            text.substring(0, start) + `[=${selection}]` + text.substring(end);
          textarea.selectionStart = start + 2;
          textarea.selectionEnd = end + 2;
        }
      }
    }
  }
  document.addEventListener("mouseup", applyBrackets);
  document.addEventListener("keydown", (event) => {
    if (
      (event.ctrlKey && event.key === "b") ||
      (event.altKey && event.key === "[")
    ) {
      applyBrackets();
      event.preventDefault();
    }
  });

  /*==============================================
    사전 체크박스 동적 생성 (ARIA 레이블 추가)
  ==============================================*/
  function initDictionaryList() {
    const dictionaryList = document.getElementById("dictionaryList");
    if (!dictionaryList) return;
    dictionaryList.innerHTML = "";
    DICTIONARIES.forEach((dict) => {
      const label = document.createElement("label");
      label.className = "checkbox-label";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = dict;
      checkbox.setAttribute("aria-label", dict);
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(dict));
      const gridItem = document.createElement("div");
      gridItem.className = "grid-item";
      gridItem.appendChild(label);
      dictionaryList.appendChild(gridItem);
    });
  }

  // XML 미리보기 함수
  function exportToXMLPreview() {
    alert("XML 미리보기 기능 실행됨");

    try {
      console.log("1. XML 데이터 생성 시작");

      // 값이 없을 경우 "NULL"을 기본값으로 설정
      const getValue = (id) => document.getElementById(id)?.value || "";

      let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xmlContent += `  <어휘항목 식별자="${getValue("entryId")}">\n`;
      xmlContent += `    <문헌명>${getValue("documentName")}</문헌명>\n`;
      xmlContent += `    <항목>${getValue("entryName")}</항목>\n`;
      xmlContent += `    <음가>${getValue("entryPronunciation")}</음가>\n`;
      xmlContent += `    <속성>${getValue("entryAttribute")}</속성>\n`;
      xmlContent += `    <어의>${getValue("entryDefinition")}</어의>\n`;

      // 어의보충 태그는 값이 있을 때만 추가
      const entryDefinitionDetail = getValue("entryDefinitionDetail");
      if (entryDefinitionDetail.trim() !== "") {
        xmlContent += `    <어의보충>${entryDefinitionDetail}</어의보충>\n`;
      }

      xmlContent += `    <번역용례>\n`;

      // 첫 번째 용례
      xmlContent += `      <용례 식별자="${getValue("identifier1")}">\n`;
      xmlContent += `        <출전정보 식별자="${getValue(
        "chapterNo1"
      )}">${getValue("chapter1")}</출전정보>\n`;
      xmlContent += `        <원문>${getValue("originalText1")}</원문>\n`;
      xmlContent += `        <번역문>${getValue("translatedText1")}</번역문>\n`;
      xmlContent += `      </용례>\n`;

      // 두 번째 용례 (추가적인 용례 입력이 있으면 포함)
      if (document.getElementById("originalText2")?.value) {
        xmlContent += `      <용례 식별자="${getValue("identifier2")}">\n`;
        xmlContent += `        <출전정보 식별자="${getValue(
          "chapterNo2"
        )}">${getValue("chapter2")}</출전정보>\n`;
        xmlContent += `        <원문>${getValue("originalText2")}</원문>\n`;
        xmlContent += `        <번역문>${getValue(
          "translatedText2"
        )}</번역문>\n`;
        xmlContent += `      </용례>\n`;
      }

      xmlContent += `    </번역용례>\n`;
      xmlContent += `    <참조사전>\n`;

      // 선택된 사전 추가
      const dictionaryList = document.getElementById("dictionaryList");
      const selectedDictionaries = dictionaryList.querySelectorAll(
        "input[type='checkbox']:checked"
      );
      selectedDictionaries.forEach((checkbox) => {
        xmlContent += `      <사전>${checkbox.value}</사전>\n`;
      });

      xmlContent += `    </참조사전>\n`;
      xmlContent += `  </어휘항목>\n`;

      console.log("✅ 2. XML 데이터 생성 완료");
      console.log("XML Content:", xmlContent);

      // 팝업 창 열기
      const previewWindow = window.open("", "_blank", "width=800,height=600");
      if (!previewWindow) {
        alert("팝업 창을 열 수 없습니다. 팝업 차단을 해제하세요.");
        return;
      }

      console.log("✅ 3. 팝업 창이 정상적으로 열렸음");

      // XML 출력
      previewWindow.document.body.innerHTML = `<h2>XML 미리보기</h2><pre style="white-space: pre-wrap; font-family: monospace; background: #f9f9f9; padding: 10px; border: 1px solid #ccc;">${escapeHtml(
        xmlContent
      )}</pre>`;

      console.log("✅ 4. XML 미리보기 출력 완료");
    } catch (error) {
      console.error("❌ XML 생성 중 오류 발생:", error);
      alert(
        "XML 미리보기를 생성하는 중 오류가 발생했습니다. 콘솔을 확인하세요."
      );
    }
  }

  // 특정 요소의 값을 가져오는 함수
  function getValue(id) {
    return document.getElementById(id)?.value || "NULL";
  }

  // 엑셀 배열 미리보기 버튼 클릭 시 실행되는 함수
  async function exportToExcelArrayPreview() {
    alert("엑셀 배열 미리보기 기능 실행됨");

    try {
      console.log("📌 엑셀 배열 데이터 생성 시작");

      // 값이 없을 경우 빈 문자열("")을 기본값으로 설정
      const getValue = (id) => {
        const element = document.getElementById(id);
        return element && element.value.trim() !== ""
          ? element.value.trim()
          : "";
      };

      // 엑셀 헤더 정의
      const header = [
        "식별자",
        "문헌명",
        "항목",
        "음가",
        "속성",
        "어의",
        "어의보충",
        "용례 식별자1",
        "출전정보1",
        "원문1",
        "번역문1",
        "용례 식별자2",
        "출전정보2",
        "원문2",
        "번역문2",
        "참조사전",
      ];

      // 엑셀 데이터 행 생성
      const row = [
        getValue("entryId"), // 식별자
        getValue("documentName"), // 문헌명
        getValue("entryName"), // 항목
        getValue("entryPronunciation"), // 음가
        getValue("entryAttribute"), // 속성
        getValue("entryDefinition"), // 어의
        getValue("entryDefinitionDetail"), // 어의보충
        getValue("identifier1"), // 용례 식별자1
        getValue("chapterNo1"), // 출전정보1
        getValue("chapter1"), // 원문1
        getValue("originalText1"), // 번역문1
        getValue("translatedText1"), // 번역문1
        getValue("identifier2"), // 용례 식별자2
        getValue("chapterNo2"), // 출전정보2
        getValue("chapter2"), // 원문2
        getValue("originalText2"), // 번역문2
        getValue("translatedText2"), // 번역문2
      ];

      // 참조사전 데이터 추가
      const dictionaryList = document.getElementById("dictionaryList");
      const selectedDictionaries = dictionaryList.querySelectorAll(
        "input[type='checkbox']:checked"
      );
      const dictionaries = Array.from(selectedDictionaries)
        .map((cb) => cb.value)
        .join("; ");
      row.push(dictionaries);

      console.log("✅ 배열 생성 완료:", row);

      // row 배열을 탭(\t) 구분 텍스트로 변환하여 클립보드에 복사
      const rowText = row.join("\t");
      await navigator.clipboard.writeText(rowText);

      console.log("✅ 클립보드에 복사 완료:", rowText);

      // 미리보기 HTML 생성
      const previewHtml = `
        <h2>엑셀 1행 배열 미리보기</h2>
        <h3>탭 구분 텍스트</h3>
        <textarea id="copyTextArea" style="width: 100%; height: 100px; font-family: monospace; white-space: pre-wrap;">${rowText}</textarea>
        <button onclick="copyToClipboard('copyTextArea')">복사</button>
        <script>
          window.onload = function() {
            const textarea = document.getElementById('copyTextArea');
            textarea.select();
            textarea.setSelectionRange(0, 99999); // iOS 호환용
          };
        </script>
      `;

      // 팝업 창에 미리보기 출력
      const previewWindow = window.open("", "_blank", "width=1000,height=500");
      if (!previewWindow) {
        alert("팝업 차단으로 인해 새 창을 열 수 없습니다.");
        return;
      }

      previewWindow.document.body.innerHTML = previewHtml;
      previewWindow.document.title = "엑셀 배열 미리보기";

      // 복사 함수 삽입
      previewWindow.copyToClipboard = function (id) {
        const text = previewWindow.document.getElementById(id).value;
        navigator.clipboard
          .writeText(text)
          .then(() => {
            alert("복사 완료!");
          })
          .catch((err) => {
            alert("복사 실패: " + err);
          });
      };

      console.log("✅ 엑셀 배열 미리보기 출력 완료");
    } catch (error) {
      console.error("❌ 오류 발생:", error);
      alert("오류가 발생했습니다. 콘솔을 확인하세요.");
    }
  }
  /*==============================================
    전역(window)에서 호출할 필요가 있는 함수 노출
  ==============================================*/
  window.loadExamples = loadExamples;
  window.fetchExample = fetchExample;
  window.exportToXMLPreview = exportToXMLPreview;

  // 전역에서 접근 가능하도록 window에 함수 추가
  window.onload = function () {
    document
      .getElementById("xmlPreviewBtn")
      .addEventListener("click", exportToXMLPreview); // ✅ 함수 연결 확인
    document
      .getElementById("exportExcelPreviewBtn")
      .addEventListener("click", exportToExcelArrayPreview); // ✅ 엑셀 미리보기 버튼 연결
  };
})();
