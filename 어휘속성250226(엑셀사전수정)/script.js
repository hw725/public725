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
  const DICTIONARIES = ["漢韓大辭典", "漢語大詞典", "大漢和辭典", "其他辭典"];
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
    initThemeToggle();
    initDictionaryList();

    // ✅ 검색 입력 필드에 keyup 이벤트 리스너 추가
    const searchInput = document.getElementById("searchEntry");
    if (searchInput) {
      searchInput.addEventListener("keyup", filterEntries);
    } else {
      console.error("❌ searchEntry 입력 필드를 찾을 수 없음!");
    }
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
    XML 업로드 및 파싱 (에러 처리 강화)
==============================================*/

  // 🔹 영어 속성을 한글 속성으로 변환하는 매핑 추가
  const ATTRIBUTE_MAP = {
    nation: "국가",
    person: "인명",
    place: "지명",
    era: "연호",
    book: "서명",
    position: "관직",
    term: "용어",
    canon: "경전",
    object: "물명",
    building: "건물",
    family: "가문",
  };

  function loadUploadedXML() {
    const fileInput = document.getElementById("xmlUpload");
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(e.target.result, "text/xml");
        const docElements = xmlDoc.getElementsByTagName("DOC");

        // 🔹 기존 코드에서 누락된 에러 메시지 표시 기능 복구
        if (!docElements || !docElements[0]) {
          const errorMessage = document.getElementById("errorMessage");
          if (errorMessage) {
            errorMessage.classList.remove("hidden"); // ✅ 에러 메시지를 표시하도록 수정
          }
          return;
        }

        const entries = docElements[0].children;
        entryData = [];
        entryCounter = 1;

        Array.from(entries).forEach((entry) => {
          const tagName = entry.tagName;
          const entryName = entry.textContent.trim();
          const entryId = `I_jti_1h02_${entryCounter++}`;

          // ✅ 영어 속성을 한글 속성으로 변환 (없으면 원래 값 유지)
          const translatedAttribute = ATTRIBUTE_MAP[tagName] || tagName;

          entryData.push({
            id: entryId,
            name: entryName,
            attribute: translatedAttribute, // 🔹 변환된 속성 저장
          });
        });

        console.log("✅ XML 데이터 로드 완료. entryData:", entryData);

        // ✅ 기존 코드와 동일하게 `filterEntries()` 호출 유지
        filterEntries();
      } catch (error) {
        console.error("❌ XML 파싱 중 오류:", error);

        // 🔹 기존 코드에서 에러 발생 시 alert 메시지 표시 (누락된 부분 복구)
        alert("XML 파일 파싱 중 오류가 발생했습니다.");
      }
    };

    reader.onerror = function () {
      console.error("❌ XML 파일 읽기 오류:", reader.error);

      // 🔹 기존 코드에서 누락된 alert 복구
      alert("XML 파일 읽는 중 오류가 발생했습니다.");
    };

    reader.readAsText(file);
  }

  /*==============================================
    항목 검색 및 목록 필터링
  ==============================================*/
  function filterEntries() {
    const searchInput = document.getElementById("searchEntry");
    const resultContainer = document.getElementById("entryList");
    const searchValue = searchInput.value.trim().toLowerCase();

    resultContainer.innerHTML = "";

    // 🔹 검색어가 없으면 목록을 숨김
    if (searchValue === "") {
      resultContainer.style.display = "none";
      return;
    }

    // 🔹 검색어와 일치하는 항목 우선 정렬
    let filteredEntries = entryData
      .filter((entry) => entry.name.toLowerCase().includes(searchValue))
      .sort((a, b) => {
        let aMatch = a.name.toLowerCase().startsWith(searchValue);
        let bMatch = b.name.toLowerCase().startsWith(searchValue);
        return bMatch - aMatch; // 완전 일치하는 항목을 우선적으로 표시
      })
      .slice(0, 10); // 🔹 검색 후 상위 10개를 선택

    console.log("🔎 검색어:", searchValue);
    console.log(
      "✅ 필터링된 결과:",
      filteredEntries.map((entry) => entry.name)
    );

    if (filteredEntries.length === 0) {
      resultContainer.style.display = "none";
      return;
    }

    resultContainer.style.display = "block";

    filteredEntries.forEach((entry) => {
      const div = document.createElement("div");
      div.textContent = entry.name;
      div.setAttribute("tabindex", "0");
      div.addEventListener("click", () => {
        selectEntry(entry);
        resultContainer.style.display = "none"; // ✅ 선택 후 목록 숨김
      });
      resultContainer.appendChild(div);
    });
  }

  // 🔹 검색 입력창 클릭 시 자동으로 검색 목록 표시
  document.getElementById("searchEntry").addEventListener("focus", () => {
    document.getElementById("entryList").style.display = "block";
  });

  // 🔹 검색창 외부 클릭 시 자동 숨김
  document.addEventListener("click", (event) => {
    const searchEntry = document.getElementById("searchEntry");
    const entryList = document.getElementById("entryList");

    if (
      !searchEntry.contains(event.target) &&
      !entryList.contains(event.target)
    ) {
      entryList.style.display = "none";
    }
  });

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
      태깅원문: row["태깅원문"]?.trim() || "(태깅 원문 없음)",
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
      document.getElementById(`taggedOriginalText${index}`).innerHTML =
        applyTagStyles(example["태깅원문"]);

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
      const getValue = (id) => document.getElementById(id)?.value || "NULL";

      let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xmlContent += `  <어휘항목 식별자="${getValue("entryId")}">\n`;
      xmlContent += `    <문헌명>${getValue("documentName")}</문헌명>\n`;
      xmlContent += `    <항목>${getValue("entryName")}</항목>\n`;
      xmlContent += `    <음가>${getValue("entryPronunciation")}</음가>\n`;
      xmlContent += `    <속성>${getValue("entryAttribute")}</속성>\n`;
      xmlContent += `    <어의>${getValue("entryDefinition")}</어의>\n`;
      xmlContent += `    <어의보충>${getValue(
        "entryDefinitionDetail"
      )}</어의보충>\n`;
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

  // 엑셀 파일을 저장하는 함수
  async function saveToExcel(file, callback) {
    const reader = new FileReader();
    reader.onload = async function (event) {
      try {
        console.log("📌 파일 로드 시작");

        let data = new Uint8Array(event.target.result);
        console.log("✅ 파일 로드 완료, 크기:", data.length);

        let workbook;
        try {
          workbook = XLSX.read(data, { type: "array" });
          console.log("✅ 워크북 로드 완료:", workbook);
        } catch (err) {
          console.error("❌ 엑셀 파일을 불러오는 중 오류 발생:", err);
          alert("엑셀 파일을 불러오는 중 오류가 발생했습니다.");
          return;
        }

        if (!workbook.SheetNames.length) {
          throw new Error("❌ 엑셀 파일에 유효한 시트가 없습니다.");
        }

        let sheetName = workbook.SheetNames[0];
        let worksheet = workbook.Sheets[sheetName];
        let sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        console.log("✅ 로드된 시트 데이터:", sheetData);

        if (!sheetData[1] || sheetData.length < 2) {
          console.error(
            "❌ 오류: 엑셀 파일이 비어 있거나 데이터가 부족합니다."
          );
          alert("❌ 올바른 엑셀 파일을 업로드하세요.");
          return;
        }

        let headers = sheetData[1];
        console.log("✅ 헤더 정보:", headers);

        let headerIndices = headers
          .map((col, index) =>
            typeof col === "string" && col.trim() && !col.startsWith("Unnamed")
              ? index
              : -1
          )
          .filter((index) => index !== -1);

        console.log("✅ 헤더 인덱스 매핑:", headerIndices);

        // ✅ 기본 태그(빈 값) 추가 (개행 및 탭 적용) → **각 컬럼에 정확하게 배치**
        let baseEntry = [
          // ✅ 어휘항목 식별자
          String.raw`\t<어휘항목 식별자="`,
          "",
          String.raw`">\n\t\t<문헌명>`,
          "",
          String.raw`</문헌명>\n\t\t<항목>`,
          "",
          String.raw`</항목>\n\t\t<음가>`,
          "",
          String.raw`</음가>\n\t\t<속성>`,
          "",
          String.raw`</속성>\n\t\t<어의>`,
          "",
          String.raw`</어의>\n\t\t<어의보충>`,
          "",
          String.raw`</어의보충>\n\t\t<번역용례>\n\t\t\t<용례 식별자="`, // ✅ 첫 번째 용례
          "",
          String.raw`">\n\t\t\t\t<출전정보 식별자="`,
          "",
          String.raw`">`,
          "",
          String.raw`</출전정보>\n\t\t\t\t<원문>`,
          "",
          String.raw`</원문>\n\t\t\t\t<번역문>`,
          "",
          String.raw`</번역문>\n\t\t\t</용례>\n\t\t\t<용례 식별자="`, // ✅ 두 번째 용례
          "",
          String.raw`">\n\t\t\t\t<출전정보 식별자="`,
          "",
          String.raw`">`,
          "",
          String.raw`</출전정보>\n\t\t\t\t<원문>`,
          "",
          String.raw`</원문>\n\t\t\t\t<번역문>`,
          "",
          String.raw`</번역문>\n\t\t\t</용례>\n\t\t</번역용례>\n\t\t<참조사전>\n\t\t\t<사전>`, // ✅ 사전 정보
          "",
          String.raw`</사전>\n\t\t\t<사전>`,
          "",
          String.raw`</사전>\n\t\t</참조사전>\n\t</어휘항목>`,
        ];
        // ✅ 현재 sheetData에서 가장 긴 행의 길이를 기준으로 fullEntry 길이 설정
        let maxRowLength = Math.max(
          ...sheetData.map((row) => row.length),
          baseEntry.length
        );

        // ✅ `baseEntry`의 길이가 `maxRowLength`보다 작을 경우만 추가 (오류 방지)
        if (baseEntry.length < maxRowLength) {
          baseEntry = baseEntry.concat(
            new Array(maxRowLength - baseEntry.length).fill("")
          );
        }

        // ✅ fullEntry를 maxRowLength 길이에 맞춰 초기화
        let fullEntry = new Array(maxRowLength).fill("");

        // ✅ 기존 values 유지 (값 삽입)
        let values = [
          "entryId",
          "documentName",
          "entryName",
          "entryPronunciation",
          "entryAttribute",
          "entryDefinition",
          "entryDefinitionDetail",
          "identifier1",
          "chapterNo1",
          "chapter1",
          "originalText1",
          "translatedText1",
          "identifier2",
          "chapterNo2",
          "chapter2",
          "originalText2",
          "translatedText2",
        ];

        values.forEach((value, i) => {
          if (headerIndices[i] !== undefined) {
            fullEntry[headerIndices[i]] = getValue(value);
          }
        });

        // ✅ 사전 데이터를 가로 방향으로 추가
        const dictionaryList = document.getElementById("dictionaryList");
        const selectedDictionaries = dictionaryList.querySelectorAll(
          "input[type='checkbox']:checked"
        );

        selectedDictionaries.forEach((checkbox, index) => {
          let dictionaryIndices = headerIndices.filter(
            (idx) => headers[idx] === "사전"
          );

          if (dictionaryIndices.length > index) {
            let dictionaryIndex = dictionaryIndices[index];

            if (fullEntry[dictionaryIndex]) {
              fullEntry[dictionaryIndex] += `, ${checkbox.value}`;
            } else {
              fullEntry[dictionaryIndex] = checkbox.value;
            }

            console.log(
              `📌 사전 '${checkbox.value}' 추가됨 (인덱스: ${dictionaryIndex})`
            );
          } else {
            console.warn(`⚠️ 사전 '${checkbox.value}' 추가 실패: 인덱스 초과`);
          }
        });

        // ✅ 기존 sheetData 유지 + 새로운 데이터 삽입
        console.log(
          "✅ 기존 sheetData 상태 (추가 전):",
          JSON.stringify(sheetData, null, 2)
        );
        sheetData.push(
          baseEntry.map((tag, index) => tag || fullEntry[index] || "")
        ); // 🛠️ baseEntry와 fullEntry를 컬럼별로 병합
        console.log(
          "✅ 최종 sheetData 상태 (추가 후):",
          JSON.stringify(sheetData, null, 2)
        );

        let newWorksheet = XLSX.utils.aoa_to_sheet(sheetData);
        workbook.Sheets[sheetName] = newWorksheet;

        console.log("✅ 엑셀 데이터 변환 성공");

        let wbout;
        try {
          wbout = XLSX.write(workbook, { bookType: "xlsx", type: "binary" });
          console.log("✅ 엑셀 바이너리 변환 성공");
        } catch (err) {
          console.error("❌ XLSX.write() 오류 발생:", err);
          alert("❌ 엑셀 파일 변환 중 오류가 발생했습니다.");
          return;
        }

        let blob = new Blob([s2ab(wbout)], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        // ✅ 기존 파일을 덮어쓰기 위해 File System Access API 적용
        if (window.showSaveFilePicker) {
          try {
            const handle = await window.showSaveFilePicker({
              suggestedName: file.name,
              types: [
                {
                  description: "Excel File",
                  accept: {
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                      [".xlsx"],
                  },
                },
              ],
            });

            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();

            alert("파일이 성공적으로 덮어쓰기되었습니다!");
          } catch (error) {
            console.error("❌ 파일 저장 중 오류 발생:", error);
            alert(
              "파일 저장 중 오류가 발생했습니다. 기본 다운로드 방식으로 전환합니다."
            );

            // ✅ 기본 다운로드 방식으로 전환
            let downloadLink = document.createElement("a");
            downloadLink.href = URL.createObjectURL(blob);
            downloadLink.download = file.name; // 기존 파일명 유지
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
          }
        } else {
          // ✅ showSaveFilePicker 미지원 브라우저에서는 자동 다운로드 방식 사용
          let downloadLink = document.createElement("a");
          downloadLink.href = URL.createObjectURL(blob);
          downloadLink.download = file.name; // 기존 파일명 유지
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }

        console.log("✅ 파일 저장 완료");

        if (callback) {
          callback();
        }
      } catch (error) {
        console.error("❌ 엑셀 저장 중 오류 발생:", error);
        alert("❌ 엑셀 저장 중 오류가 발생했습니다. 콘솔을 확인하세요.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function s2ab(s) {
    let buf = new ArrayBuffer(s.length);
    let view = new Uint8Array(buf);
    for (let i = 0; i < s.length; i++) {
      view[i] = s.charCodeAt(i) & 0xff;
    }
    return buf;
  }

  /*==============================================
    전역(window)에서 호출할 필요가 있는 함수 노출
  ==============================================*/
  window.loadUploadedXML = loadUploadedXML;
  window.loadExamples = loadExamples;
  window.fetchExample = fetchExample;
  window.exportToXMLPreview = exportToXMLPreview;
  window.saveToExcel = saveToExcel; // saveToExcel 함수를 window 객체에 추가

  // 전역에서 접근 가능하도록 window에 함수 추가
  window.onload = function () {
    document
      .getElementById("xmlPreviewBtn")
      .addEventListener("click", exportToXMLPreview);
    document.getElementById("exportExcelBtn").addEventListener(
      "click",
      function () {
        const fileInput = document.getElementById("xlsxUploadSave");
        const file = fileInput.files[0];
        if (file) {
          saveToExcel(file);
        } else {
          alert("엑셀 파일을 선택하세요.");
        }
      },
      { once: true }
    ); // 한 번만 실행되도록 설정
    document
      .getElementById("loadExamplesBtn")
      .addEventListener("click", loadExamples);
  };

  document
    .getElementById("exportExcelBtn")
    .addEventListener("click", function () {
      const fileInput = document.getElementById("xlsxUploadSave");
      const file = fileInput.files[0];
      if (file) {
        saveToExcel(file);
      } else {
        alert("엑셀 파일을 선택하세요.");
      }
    });
})();
